import { Workout } from '@/types';

// The "top set" of a workout session is its heaviest single set — used both
// for the Strength progress chart (src/app/progress.tsx) and for
// personal-record detection there and in
// src/components/logs/WorkoutLog.tsx. A session with no sets logged has no
// top set to report.
export function topSetWeight(sets: Workout['sets']): number {
  return sets && sets.length ? Math.max(...sets.map(s => s.weight)) : 0;
}
