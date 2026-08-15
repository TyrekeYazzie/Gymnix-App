import { supabase } from './supabase';
import { AchievementDef, MyAchievement, UnlockedAchievement } from '@/types';

// The catalog (public.achievements) and the caller's own unlocks
// (public.user_achievements) are both directly readable under RLS — see
// supabase/migrations/20260815010000_achievements.sql — so this merges
// them client-side rather than needing a dedicated RPC.
export async function getMyAchievements(): Promise<MyAchievement[]> {
  const [{ data: catalog, error: catalogError }, { data: unlocks, error: unlocksError }] = await Promise.all([
    supabase.from('achievements').select('*').order('sort_order'),
    supabase.from('user_achievements').select('achievement_key, unlocked_at'),
  ]);

  if (catalogError) { console.error('Failed to load achievement catalog:', catalogError.message); return []; }
  if (unlocksError) console.error('Failed to load unlocked achievements:', unlocksError.message);

  const unlockedAt = new Map((unlocks ?? []).map(u => [u.achievement_key, u.unlocked_at]));
  return (catalog ?? []).map((a: AchievementDef) => ({
    ...a,
    unlocked_at: unlockedAt.get(a.key) ?? null,
  }));
}

// Thin wrapper around check_and_unlock_achievements() — see
// supabase/migrations/20260815010000_achievements.sql. Safe to call after
// any log save; it's a no-op (returns []) when nothing new was earned.
export async function checkAndUnlockAchievements(): Promise<UnlockedAchievement[]> {
  const { data, error } = await supabase.rpc('check_and_unlock_achievements');
  if (error) { console.error('Failed to check achievements:', error.message); return []; }
  return data ?? [];
}
