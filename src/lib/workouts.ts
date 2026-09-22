import { Workout } from '@/types';

// The "top set" of a workout session is its heaviest single set — used both
// for the Strength progress chart (src/app/progress.tsx) and for
// personal-record detection there and in
// src/components/logs/WorkoutLog.tsx. A session with no sets logged has no
// top set to report.
export function topSetWeight(sets: Workout['sets']): number {
  return sets && sets.length ? Math.max(...sets.map(s => s.weight)) : 0;
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
