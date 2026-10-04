// total_xp can dip below 0: deleting a log made before XP moved to the
// server subtracts XP it may never have awarded. Treat that as 0 rather
// than showing "Level NaN" (the leaderboards already clamp the same way).
function clampXP(totalXP: number): number {
  return Number.isFinite(totalXP) ? Math.max(0, totalXP) : 0;
}

export function calcLevel(totalXP: number): number {
  return Math.floor(Math.sqrt(clampXP(totalXP) / 100));
}

export function xpForLevel(level: number): number {
  return level * level * 100;
}

export function xpProgress(rawXP: number) {
  const totalXP = clampXP(rawXP);
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
