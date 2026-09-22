import { CardioLogEntry } from '@/types';

export interface WeekBucket {
  start: Date;   // local midnight, first day of the 7-day window
  minutes: number;
}

// Total cardio minutes in each of the last `weeks` rolling 7-day windows,
// oldest first — the last bucket is "the past 7 days including today".
// Rolling windows (rather than calendar weeks) mean the current bar is never
// artificially short just because it's Monday. Duration is stored as text
// like "30 min", same parseInt the rest of the app uses.
export function weeklyCardioMinutes(
  entries: Pick<CardioLogEntry, 'duration' | 'created_at'>[],
  weeks: number,
): WeekBucket[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const buckets: WeekBucket[] = Array.from({ length: weeks }, (_, i) => {
    const start = new Date(today);
    start.setDate(today.getDate() - 6 - 7 * (weeks - 1 - i));
    return { start, minutes: 0 };
  });
  const firstStart = buckets[0].start.getTime();
  const DAY_MS = 24 * 60 * 60 * 1000;

  for (const e of entries) {
    const d = new Date(e.created_at);
    d.setHours(0, 0, 0, 0);
    // Round, not floor, so a DST shift inside the range can't nudge a day
    // into the neighbouring bucket.
    const dayIndex = Math.round((d.getTime() - firstStart) / DAY_MS);
    const bucket = Math.floor(dayIndex / 7);
    if (bucket >= 0 && bucket < weeks) {
      buckets[bucket].minutes += parseInt(e.duration ?? '0', 10) || 0;
    }
  }
  return buckets;
}

// ISO timestamp for the start of the oldest bucket, for the Supabase
// `.gte('created_at', …)` filter so only the needed rows are fetched.
export function weeklyWindowStart(weeks: number): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - 6 - 7 * (weeks - 1));
  return d.toISOString();
}

// ── Pace ────────────────────────────────────────────────────
// Pace (minutes per mile/km) only means something for steady distance
// activities, and only compared within one activity — a walking mile and a
// running mile aren't the same trend. Swim is logged per 100m and HIIT has
// no distance, so both are left out.
export const PACE_TYPES = ['Run', 'Walk', 'Bike', 'Row'];

const KM_PER_MI = 1.609344;

type PaceInput = Pick<CardioLogEntry, 'type' | 'distance_km' | 'duration' | 'created_at'>;

const minutesOf = (e: PaceInput) => parseInt(e.duration ?? '0', 10) || 0;
const hasPace = (e: PaceInput) => (e.distance_km ?? 0) > 0 && minutesOf(e) > 0;

// Minutes per mile (imperial) or per km (metric) for one session.
export function sessionPace(e: PaceInput, imperial: boolean): number {
  const dist = imperial ? e.distance_km! / KM_PER_MI : e.distance_km!;
  return minutesOf(e) / dist;
}

// Most-logged pace-able activity among sessions that have a distance, or
// null if there are none (ties go to the most recent, assuming newest-first).
export function pickPaceType(entries: PaceInput[]): string | null {
  const counts = new Map<string, number>();
  for (const e of entries) {
    if (PACE_TYPES.includes(e.type) && hasPace(e)) counts.set(e.type, (counts.get(e.type) ?? 0) + 1);
  }
  let best: string | null = null;
  let bestCount = 0;
  for (const [type, count] of counts) {
    if (count > bestCount) { best = type; bestCount = count; }
  }
  return best;
}

// Per-session paces for one activity, oldest first, capped to the most
// recent `limit` sessions — plus the distance-weighted average across them
// (total time ÷ total distance, so a 5-mile run counts more than a 1-mile
// one, which is what "my average mile" actually means).
export function paceTrend(
  entries: PaceInput[],   // newest first
  type: string,
  imperial: boolean,
  limit: number,
): { paces: number[]; average: number | null } {
  const sessions = entries.filter(e => e.type === type && hasPace(e)).slice(0, limit).reverse();
  const totalMin = sessions.reduce((s, e) => s + minutesOf(e), 0);
  const totalKm = sessions.reduce((s, e) => s + (e.distance_km ?? 0), 0);
  const totalDist = imperial ? totalKm / KM_PER_MI : totalKm;
  return {
    paces: sessions.map(e => sessionPace(e, imperial)),
    average: totalDist > 0 ? totalMin / totalDist : null,
  };
}

// 9.7 → "9:42". Rounds to the nearest second, carrying 60s into the minute.
export function formatPace(minutes: number): string {
  const totalSec = Math.round(Math.abs(minutes) * 60);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}
