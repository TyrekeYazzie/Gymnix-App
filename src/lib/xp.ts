import { supabase } from './supabase';
import { setDisplayWeight } from './workouts';
import { WorkoutSet } from '@/types';

export function calcLevel(totalXP: number): number {
  return Math.floor(Math.sqrt(totalXP / 100));
}

export function xpForLevel(level: number): number {
  return level * level * 100;
}

export function xpProgress(totalXP: number) {
  const level = calcLevel(totalXP);
  const currentLevelXP = xpForLevel(level);
  const nextLevelXP = xpForLevel(level + 1);
  const current = totalXP - currentLevelXP;
  const needed = nextLevelXP - currentLevelXP;
  const percent = Math.round((current / needed) * 100);
  return { level, current, needed, percent };
}

// The weight bonus is computed on the weight in the account's display unit,
// which is what it has always been computed on (sets used to be stored as
// typed). Keeps XP identical to before now that sets are stored in kg.
export function calcWorkoutXP(sets: WorkoutSet[], imperial: boolean): number {
  if (!sets || sets.length === 0) return 5;
  return sets.reduce((total, set) => {
    const base = 10;
    const weightBonus = Math.min(Math.floor(setDisplayWeight(set, imperial) / 10) * 2, 20);
    return total + base + weightBonus;
  }, 0);
}

export function calcCardioXP(durationMin: number): number {
  return Math.min(15 + durationMin, 75);
}

export const XP_MEAL = 5;
export const XP_WATER = 3;
export const XP_WEIGHT = 8;

// userId is kept for call-site compatibility (every caller already has it handy),
// but the increment itself happens server-side via auth.uid() — see the
// increment_xp migration — so two awards firing close together (e.g. logging
// water and a meal back to back) can't race and clobber each other the way a
// client-side read-then-write would.
export async function awardXP(userId: string, xp: number): Promise<number | null> {
  const { data, error } = await supabase.rpc('increment_xp', { p_xp: xp });

  if (error) {
    console.error('Failed to award XP:', error.message);
    return null;
  }

  return data ?? null;
}
