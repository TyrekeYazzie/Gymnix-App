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
