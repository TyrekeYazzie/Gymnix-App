import { supabase } from './supabase';
import { LevelLeaderboardEntry, LogCountLeaderboardEntry, StreakLeaderboardEntry } from '@/types';

// Thin wrappers around the leaderboard RPCs defined in
// supabase/migrations/20260805000000_leaderboards.sql. Each RPC is a
// SECURITY DEFINER function scoped to return only a name + a single
// aggregate number — never raw profile/workout/cardio rows — so these
// calls are safe to make from any authenticated user's device.

export type MyLevelRank = { rnk: number; total_xp: number; level: number };
export type MyLogCountRank = { rnk: number; log_count: number };
export type MyStreakRank = { rnk: number; current_streak: number };

export async function getLevelLeaderboard(limit = 50): Promise<LevelLeaderboardEntry[]> {
  const { data, error } = await supabase.rpc('get_level_leaderboard', { limit_count: limit });
  if (error) { console.error('Failed to load level leaderboard:', error.message); return []; }
  return data ?? [];
}

export async function getMyLevelRank(): Promise<MyLevelRank | null> {
  const { data, error } = await supabase.rpc('get_my_level_rank');
  if (error) { console.error('Failed to load my level rank:', error.message); return null; }
  return data?.[0] ?? null;
}

export async function getStrengthLeaderboard(limit = 50): Promise<LogCountLeaderboardEntry[]> {
  const { data, error } = await supabase.rpc('get_strength_leaderboard', { limit_count: limit });
  if (error) { console.error('Failed to load strength leaderboard:', error.message); return []; }
  return data ?? [];
}

export async function getMyStrengthRank(): Promise<MyLogCountRank | null> {
  const { data, error } = await supabase.rpc('get_my_strength_rank');
  if (error) { console.error('Failed to load my strength rank:', error.message); return null; }
  return data?.[0] ?? null;
}

export async function getCardioLeaderboard(limit = 50): Promise<LogCountLeaderboardEntry[]> {
  const { data, error } = await supabase.rpc('get_cardio_leaderboard', { limit_count: limit });
  if (error) { console.error('Failed to load cardio leaderboard:', error.message); return []; }
  return data ?? [];
}

export async function getMyCardioRank(): Promise<MyLogCountRank | null> {
  const { data, error } = await supabase.rpc('get_my_cardio_rank');
  if (error) { console.error('Failed to load my cardio rank:', error.message); return null; }
  return data?.[0] ?? null;
}

export async function getStreakLeaderboard(limit = 50): Promise<StreakLeaderboardEntry[]> {
  const { data, error } = await supabase.rpc('get_streak_leaderboard', { limit_count: limit });
  if (error) { console.error('Failed to load streak leaderboard:', error.message); return []; }
  return data ?? [];
}

export async function getMyStreakRank(): Promise<MyStreakRank | null> {
  const { data, error } = await supabase.rpc('get_my_streak_rank');
  if (error) { console.error('Failed to load my streak rank:', error.message); return null; }
  return data?.[0] ?? null;
}
