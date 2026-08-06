-- Adds the fields needed to calculate a personalized calorie + macro target
-- (Mifflin-St Jeor BMR -> TDEE -> goal-adjusted calories -> macro split, see
-- src/lib/nutrition.ts). All three are optional/have safe defaults —
-- computeNutritionTargets() falls back to a sex-neutral BMR formula, a
-- 'maintain' goal, and a 'moderate' pace whenever they're unset, so no
-- backfill is required for existing rows.
--
-- `activity_level` already exists as a free-text column (see
-- 20260727000000_baseline_schema.sql) holding user-typed values like
-- "Moderate" or "Very active" from the old Edit Profile text input. It is
-- NOT constrained here on purpose — doing so would break any existing row
-- that doesn't match the new canonical slugs ('sedentary' | 'light' |
-- 'moderate' | 'active' | 'very_active'). The app only ever writes those
-- slugs going forward (via the new Nutrition Goals settings screen);
-- computeNutritionTargets() falls back to the 'moderate' multiplier for
-- anything else it finds in that column.

-- IF NOT EXISTS on each column makes this safe to paste and run again if a
-- prior attempt partially applied (e.g. added `sex` then failed later) —
-- Postgres errors instantly on a plain ADD COLUMN if the column is already
-- there, this just skips whatever's already in place.
alter table public.profiles
  add column if not exists sex               text check (sex in ('male', 'female')),
  add column if not exists weight_goal_type  text not null default 'maintain' check (weight_goal_type in ('lose', 'maintain', 'gain')),
  add column if not exists goal_pace         text not null default 'moderate' check (goal_pace in ('mild', 'moderate', 'aggressive'));
