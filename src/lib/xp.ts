import { supabase } from './supabase';

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

export function calcWorkoutXP(sets: { reps: number; weight: number }[]): number {
  if (!sets || sets.length === 0) return 5;
  return sets.reduce((total, set) => {
    const base = 10;
    const weightBonus = Math.min(Math.floor(set.weight / 10) * 2, 20);
    return total + base + weightBonus;
  }, 0);
}

export function calcCardioXP(durationMin: number): number {
  return Math.min(15 + durationMin, 75);
}

export const XP_MEAL = 5;
export const XP_WATER = 3;
export const XP_WEIGHT = 8;

export async function awardXP(userId: string, xp: number): Promise<number | null> {
  const { data: profile } = await supabase
    .from('profiles')
    .select('total_xp')
    .eq('id', userId)
    .single();

  if (!profile) return null;

  const newXP = (profile.total_xp ?? 0) + xp;

  const { data, error } = await supabase
    .from('profiles')
    .update({ total_xp: newXP })
    .eq('id', userId)
    .select('total_xp')
    .single();

  if (error) {
    console.error('Failed to award XP:', error.message);
    return null;
  }

  return data?.total_xp ?? null;
}
