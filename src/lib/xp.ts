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

// XP is awarded by the database, never by the app: triggers on the log
// tables call public.log_xp() (supabase/migrations/20261003000000_server_side_xp.sql),
// which holds the full formula. These flat amounts mirror it for display on
// the Rank Chart — keep them in sync with log_xp().
export const XP_MEAL = 5;
export const XP_WATER = 3;
export const XP_WEIGHT = 8;
