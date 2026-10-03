export type DayOfWeek = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';

// Maps a day to the workout categories trained that day (matches Workout['category']).
// A missing key or empty array means rest day.
export type WeeklyRoutine = Partial<Record<DayOfWeek, string[]>>;

// Used by src/lib/nutrition.ts to calculate BMR/TDEE and a calorie/macro
// goal — see supabase/migrations/20260806000000_nutrition_goals.sql.
export type Sex = 'male' | 'female';
// Canonical activity multiplier slugs. `profiles.activity_level` is still a
// free-text column (some existing rows predate this and hold user-typed
// text like "Very active") — the app only ever writes these five values
// going forward, and the calculator falls back to 'moderate' for anything
// else it finds there.
export type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active';
export type WeightGoalType = 'lose' | 'maintain' | 'gain';
export type GoalPace = 'mild' | 'moderate' | 'aggressive';

// Mirrors the `profiles` table. Row is auto-created by the `handle_new_user`
// trigger on signup with only id/full_name/units set — everything else
// starts null until the user fills out EditProfile.
export interface Profile {
  id: string;
  full_name: string | null;
  username: string | null;        // unique, lowercase [a-z0-9_]{3,20}; null until picked
  height_cm: number | null;
  weight_kg: number | null;
  age: number | null;
  goal: string | null;
  activity_level: string | null;
  sex: Sex | null;
  weight_goal_type: WeightGoalType;
  goal_pace: GoalPace;
  units: 'metric' | 'imperial';
  reminders_enabled: boolean;
  dark_mode_enabled: boolean;
  daily_quotes_enabled: boolean;
  avatar_path: string | null;     // storage path in the public 'avatars' bucket
  total_xp: number;
  weekly_routine: WeeklyRoutine;
  created_at: string;
  onboarding_completed_at: string | null;
}

/** One set in workouts.sets. `unit: 'kg'` means weight is in kg; untagged legacy sets are in the account's units (see setWeightKg). weight 0 = bodyweight. */
export interface WorkoutSet {
  reps: number;
  weight: number;
  unit?: 'kg';
}

export interface Workout {
  id: string;
  user_id: string;
  name: string;
  category: string | null;
  duration: string | null;
  calories: number | null;
  notes: string | null;
  sets: WorkoutSet[];
  photo_path: string | null;
  created_at: string;
}

export interface CardioLogEntry {
  id: string;
  user_id: string;
  type: string;
  distance_km: number | null;
  duration: string | null;
  calories: number | null;
  created_at: string;
}

export interface WaterLogEntry {
  id: string;
  user_id: string;
  amount_ml: number;
  created_at: string;
}

export interface WeightLogEntry {
  id: string;
  user_id: string;
  weight_kg: number;
  notes: string | null;
  created_at: string;
}

// Mirrors the `calorie_logs` table.
export interface Meal {
  id: string;
  user_id: string;
  meal_name: string;
  meal_type: string | null;
  calories: number | null;
  protein_g: number | null;
  carbs_g: number | null;
  fat_g: number | null;
  created_at: string;
}

// Mirrors the `custom_meals` table (Settings > Nutrition > Custom Meals) —
// user-defined presets that show up as quick-add chips in the Log Meal
// sheet. See supabase/migrations/20260810000000_custom_meals.sql.
export interface CustomMeal {
  id: string;
  user_id: string;
  name: string;
  calories: number;
  created_at: string;
}

// Row shape returned by the get_level_leaderboard / get_my_level_rank RPCs
// (see supabase/migrations/20260805000000_leaderboards.sql). user_id/rnk are
// absent from the "my rank" variant, which is always for the caller.
export interface LevelLeaderboardEntry {
  user_id: string;
  username: string | null;
  /** Only present for yourself and accepted friends; null for everyone else. */
  full_name: string | null;
  avatar_path: string | null;
  total_xp: number;
  level: number;
  rnk: number;
}

// Row shape returned by get_strength_leaderboard / get_cardio_leaderboard
// and their get_my_*_rank counterparts — log_count is a count of sessions
// logged, never a weight or pace value.
export interface LogCountLeaderboardEntry {
  user_id: string;
  username: string | null;
  /** Only present for yourself and accepted friends; null for everyone else. */
  full_name: string | null;
  avatar_path: string | null;
  log_count: number;
  rnk: number;
}

// Row shape returned by get_my_workout_streak (see
// supabase/migrations/20260814010000_workout_streak.sql). Both counts are
// in UTC calendar days and scoped to the caller only.
export interface WorkoutStreak {
  current_streak: number;
  longest_streak: number;
}

// Row shape returned by get_streak_leaderboard / get_my_streak_rank (see
// supabase/migrations/20260815000000_streak_leaderboard.sql). Ranked by
// current streak, not longest — matches the "day streak" shown on Dashboard.
export interface StreakLeaderboardEntry {
  user_id: string;
  username: string | null;
  /** Only present for yourself and accepted friends; null for everyone else. */
  full_name: string | null;
  avatar_path: string | null;
  current_streak: number;
  rnk: number;
}

// Row shape from public.achievements (the full catalog — see
// supabase/migrations/20260815010000_achievements.sql). `icon` is an
// Ionicons glyph name.
export interface AchievementDef {
  key: string;
  name: string;
  description: string;
  icon: string;
  category: string;
  sort_order: number;
}

// getMyAchievements() merges AchievementDef with the caller's
// user_achievements row (if any) — unlocked_at is null for locked entries,
// which is what the browsing screen keys its locked/unlocked styling off.
export interface MyAchievement extends AchievementDef {
  unlocked_at: string | null;
}

// Row shape returned by check_and_unlock_achievements() — only the
// achievements newly unlocked by that specific call, for banner display.
export interface UnlockedAchievement {
  key: string;
  name: string;
  description: string;
  icon: string;
}

// One exercise's prescription within a workout_templates.exercises array.
// category matches Workout['category'] / WORKOUT_CATEGORIES; targetSets/
// targetReps seed WorkoutLog's set rows when the user hasn't logged this
// exact exercise before (see the templateStep prop on WorkoutLog).
export interface TemplateExercise {
  name: string;
  category: string;
  targetSets: number;
  targetReps: number;
}

// Mirrors the `workout_templates` table (see
// supabase/migrations/20260816000000_workout_templates.sql).
export interface WorkoutTemplate {
  id: string;
  user_id: string;
  name: string;
  exercises: TemplateExercise[];
  created_at: string;
}

export interface ValidationResult {
  isValid: boolean;
  error: string | null;
}

export interface PasswordValidationResult {
  isValid: boolean;
  unmetRules: string[];
}

export interface FormErrors {
  name?: string | null;
  email?: string | null;
  password?: string[];
  general?: string | null;
}
