// Pure computation for the Weekly Recap screen (src/app/insights.tsx) — turns
// two weeks of raw log rows into per-period totals and a short list of
// auto-generated, rule-based text callouts. No AI/LLM involved: every
// insight here is a fixed comparison (this week vs last week) or a fixed
// threshold, so the same data always produces the same insights.
import Ionicons from '@expo/vector-icons/Ionicons';

export interface WeekWindow { start: Date; end: Date; }

interface WorkoutRow { sets: { reps: number; weight: number }[]; created_at: string; }
interface CardioRow { duration: string | null; distance_km: number | null; created_at: string; }
interface WaterRow { amount_ml: number; created_at: string; }
interface MealRow { calories: number | null; created_at: string; }
interface WeightRow { weight_kg: number; created_at: string; }

export interface PeriodStats {
  workoutCount: number;
  /** reps × weight summed across every set in the period, in whatever unit was logged. */
  workoutVolume: number;
  cardioCount: number;
  cardioMinutes: number;
  cardioDistanceKm: number;
  waterMl: number;
  /** Days (out of the days elapsed so far in the period) where total water met dailyGoalMl. */
  waterGoalDays: number;
  caloriesLoggedDays: number;
  caloriesAvgPerLoggedDay: number;
  /** Most recent weigh-in inside the period, or null if none was logged. */
  weightLast: number | null;
}

export interface Insight {
  icon: keyof typeof Ionicons.glyphMap;
  text: string;
  tone: 'positive' | 'negative' | 'neutral';
}

/** Monday 00:00 local time through "now" (exclusive upper bound = now). */
export function currentWeekWindow(now = new Date()): WeekWindow {
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  const dayOfWeek = start.getDay(); // 0 = Sun ... 6 = Sat
  const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  start.setDate(start.getDate() + diffToMonday);
  return { start, end: now };
}

export function previousWeekWindow(current: WeekWindow): WeekWindow {
  const start = new Date(current.start);
  start.setDate(start.getDate() - 7);
  return { start, end: current.start };
}

function inWindow(dateStr: string, w: WeekWindow): boolean {
  const t = new Date(dateStr).getTime();
  return t >= w.start.getTime() && t < w.end.getTime();
}

// Durations are stored as free-text (e.g. "45 min") — this mirrors the same
// best-effort parse progress.tsx already uses for its cardio total.
function parseMinutes(duration: string | null): number {
  return parseInt(duration ?? '0', 10) || 0;
}

export function computePeriodStats(
  window: WeekWindow,
  workouts: WorkoutRow[],
  cardio: CardioRow[],
  water: WaterRow[],
  meals: MealRow[],
  weights: WeightRow[],
  dailyGoalMl: number,
): PeriodStats {
  const wo = workouts.filter(w => inWindow(w.created_at, window));
  const ca = cardio.filter(c => inWindow(c.created_at, window));
  const wa = water.filter(w => inWindow(w.created_at, window));
  const me = meals.filter(m => inWindow(m.created_at, window));
  const we = weights.filter(w => inWindow(w.created_at, window)).sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );

  const waterByDay = new Map<string, number>();
  wa.forEach(w => {
    const key = new Date(w.created_at).toDateString();
    waterByDay.set(key, (waterByDay.get(key) ?? 0) + w.amount_ml);
  });
  const waterGoalDays = Array.from(waterByDay.values()).filter(ml => ml >= dailyGoalMl).length;

  const caloriesByDay = new Map<string, number>();
  me.forEach(m => {
    const key = new Date(m.created_at).toDateString();
    caloriesByDay.set(key, (caloriesByDay.get(key) ?? 0) + (m.calories ?? 0));
  });
  const caloriesLoggedDays = caloriesByDay.size;
  const caloriesTotal = Array.from(caloriesByDay.values()).reduce((s, v) => s + v, 0);

  return {
    workoutCount: wo.length,
    workoutVolume: wo.reduce((sum, w) => sum + (w.sets ?? []).reduce((s, set) => s + set.reps * set.weight, 0), 0),
    cardioCount: ca.length,
    cardioMinutes: ca.reduce((s, c) => s + parseMinutes(c.duration), 0),
    cardioDistanceKm: ca.reduce((s, c) => s + (c.distance_km ?? 0), 0),
    waterMl: wa.reduce((s, w) => s + w.amount_ml, 0),
    waterGoalDays,
    caloriesLoggedDays,
    caloriesAvgPerLoggedDay: caloriesLoggedDays > 0 ? caloriesTotal / caloriesLoggedDays : 0,
    weightLast: we.length > 0 ? we[we.length - 1].weight_kg : null,
  };
}

interface InsightOptions {
  currentStreak: number;
  weightUnit: string;
  /** kg -> display unit, e.g. lbs conversion. Identity if metric. */
  toDisplayWeight: (kg: number) => number;
  calorieGoal: number;
}

// Fixed priority order, not a dynamic "biggest change wins" ranking — the
// streak always leads (it's the one stat the rest of the app already treats
// as the headline number), then workouts, cardio, water, weight, calories.
// Each generator returns null when there isn't enough data to say anything
// meaningful, so a first-week user with sparse history just sees fewer cards
// rather than a misleading 0% or Infinity% comparison.
export function generateInsights(thisWeek: PeriodStats, lastWeek: PeriodStats, opts: InsightOptions): Insight[] {
  const insights: (Insight | null)[] = [];

  insights.push(
    opts.currentStreak > 0
      ? { icon: 'flame', text: `${opts.currentStreak}-day workout streak — keep it going.`, tone: 'positive' }
      : null
  );

  if (thisWeek.workoutCount > 0 || lastWeek.workoutCount > 0) {
    const diff = thisWeek.workoutCount - lastWeek.workoutCount;
    if (diff !== 0) {
      insights.push({
        icon: 'barbell-outline',
        text: `${Math.abs(diff)} ${diff > 0 ? 'more' : 'fewer'} workout${Math.abs(diff) === 1 ? '' : 's'} than last week (${thisWeek.workoutCount} vs ${lastWeek.workoutCount}).`,
        tone: diff > 0 ? 'positive' : 'negative',
      });
    } else if (thisWeek.workoutCount > 0) {
      insights.push({ icon: 'barbell-outline', text: `Matched last week with ${thisWeek.workoutCount} workout${thisWeek.workoutCount === 1 ? '' : 's'}.`, tone: 'neutral' });
    }
  }

  if (lastWeek.workoutVolume > 0 && thisWeek.workoutVolume > 0) {
    const pct = ((thisWeek.workoutVolume - lastWeek.workoutVolume) / lastWeek.workoutVolume) * 100;
    if (Math.abs(pct) >= 5) {
      insights.push({
        icon: 'trending-up-outline',
        text: `Workout volume is ${pct > 0 ? 'up' : 'down'} ${Math.abs(Math.round(pct))}% vs last week.`,
        tone: pct > 0 ? 'positive' : 'negative',
      });
    }
  }

  if (thisWeek.cardioMinutes > 0 || lastWeek.cardioMinutes > 0) {
    const diff = thisWeek.cardioMinutes - lastWeek.cardioMinutes;
    if (diff !== 0) {
      insights.push({
        icon: 'heart-outline',
        text: `Cardio time ${diff > 0 ? 'up' : 'down'} ${Math.abs(diff)} min vs last week (${thisWeek.cardioMinutes} vs ${lastWeek.cardioMinutes} min).`,
        tone: diff > 0 ? 'positive' : 'negative',
      });
    }
  }

  if (thisWeek.waterGoalDays !== lastWeek.waterGoalDays) {
    insights.push({
      icon: 'water-outline',
      text: `Hit your water goal ${thisWeek.waterGoalDays}/7 days this week, ${thisWeek.waterGoalDays > lastWeek.waterGoalDays ? 'up' : 'down'} from ${lastWeek.waterGoalDays}/7 last week.`,
      tone: thisWeek.waterGoalDays > lastWeek.waterGoalDays ? 'positive' : 'negative',
    });
  } else if (thisWeek.waterGoalDays === 7) {
    insights.push({ icon: 'water-outline', text: 'Perfect water week — goal hit all 7 days.', tone: 'positive' });
  }

  // Direction of "good" depends on the user's own goal (cutting vs bulking),
  // which isn't visible here — stays neutral rather than guessing that a
  // drop is automatically progress.
  if (thisWeek.weightLast !== null && lastWeek.weightLast !== null) {
    const deltaDisplay = opts.toDisplayWeight(thisWeek.weightLast) - opts.toDisplayWeight(lastWeek.weightLast);
    if (Math.abs(deltaDisplay) >= 0.2) {
      insights.push({
        icon: 'body-outline',
        text: `Body weight ${deltaDisplay > 0 ? 'up' : 'down'} ${Math.abs(deltaDisplay).toFixed(1)} ${opts.weightUnit} from last week.`,
        tone: 'neutral',
      });
    }
  }

  if (thisWeek.caloriesLoggedDays > 0 && opts.calorieGoal > 0) {
    const pct = Math.round((thisWeek.caloriesAvgPerLoggedDay / opts.calorieGoal) * 100);
    insights.push({
      icon: 'nutrition-outline',
      text: `Averaging ${Math.round(thisWeek.caloriesAvgPerLoggedDay).toLocaleString()} kcal/day logged this week — ${pct}% of your ${opts.calorieGoal.toLocaleString()} kcal goal.`,
      tone: pct >= 90 && pct <= 110 ? 'positive' : 'neutral',
    });
  }

  return insights.filter((i): i is Insight => i !== null);
}
