import { supabase } from './supabase';
import { WorkoutStreak } from '@/types';

// Thin wrapper around the get_my_workout_streak RPC (see
// supabase/migrations/20260814010000_workout_streak.sql). Replaces the old
// client-side calculation in dashboard.tsx, which only ever queried the
// last 7 days and so could never report a streak longer than 7.
export async function getMyWorkoutStreak(): Promise<WorkoutStreak | null> {
  const { data, error } = await supabase.rpc('get_my_workout_streak');
  if (error) { console.error('Failed to load workout streak:', error.message); return null; }
  return data?.[0] ?? null;
}
