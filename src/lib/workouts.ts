import { Workout, WorkoutSet } from '@/types';

export const KG_PER_LB = 0.45359237;

// Set weights are stored in kg and tagged `unit: 'kg'`. Sets saved before
// that have no tag and hold the number exactly as it was typed, in the
// account's units at the time. The account's current units are the best
// reading of those, and it's how the app has always displayed them, so
// untagged sets show up exactly as before.
export function setWeightKg(set: WorkoutSet, imperial: boolean): number {
  if (set.unit === 'kg') return set.weight;
  return imperial ? set.weight * KG_PER_LB : set.weight;
}

export function kgToDisplay(kg: number, imperial: boolean): number {
  return imperial ? kg / KG_PER_LB : kg;
}

export function displayToKg(value: number, imperial: boolean): number {
  return imperial ? value * KG_PER_LB : value;
}

/** A set's weight in the account's display unit, rounded to 0.1 (kg ↔ lb round trips land on e.g. 224.9996). */
export function setDisplayWeight(set: WorkoutSet, imperial: boolean): number {
  return Math.round(kgToDisplay(setWeightKg(set, imperial), imperial) * 10) / 10;
}

// The "top set" of a workout session is its heaviest single set, in the
// display unit — used both for the Strength progress chart
// (src/app/progress.tsx) and for personal-record detection there and in
// src/components/logs/WorkoutLog.tsx. A session with no sets logged has no
// top set to report.
export function topSetWeight(sets: WorkoutSet[] | null | undefined, imperial: boolean): number {
  return sets && sets.length ? Math.max(...sets.map(s => setDisplayWeight(s, imperial))) : 0;
}

/**
 * Parses a number typed into a set field. Accepts a comma as the decimal
 * separator (what the iOS decimal pad shows in many regions). Returns NaN for
 * anything else, so callers can reject it instead of saving garbage.
 */
export function parseDecimalInput(input: string): number {
  const normalized = input.trim().replace(',', '.');
  return /^(\d+(\.\d*)?|\.\d+)$/.test(normalized) ? Number(normalized) : NaN;
}

// The exercise name that shows up most often in the given workouts (ties go
// to whichever was logged most recently, assuming newest-first input). Used
// by the Dashboard progress card to pick one lift to chart, since mixing
// top sets across different exercises wouldn't mean anything.
export function mostLoggedExercise(workouts: Pick<Workout, 'name'>[]): string | null {
  const counts = new Map<string, number>();
  for (const w of workouts) counts.set(w.name, (counts.get(w.name) ?? 0) + 1);
  let best: string | null = null;
  let bestCount = 0;
  for (const [name, count] of counts) {
    if (count > bestCount) { best = name; bestCount = count; }
  }
  return best;
}
