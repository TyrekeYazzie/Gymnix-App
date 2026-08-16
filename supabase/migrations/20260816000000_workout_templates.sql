-- User-defined workout programs: a named, ordered list of exercises with a
-- target sets x reps prescription each. "Starting" a template
-- (src/app/templates.tsx -> (tabs)/workouts.tsx) walks through this list
-- one exercise at a time through the existing WorkoutLog sheet, same as
-- logging manually -- each exercise still lands as its own row in
-- public.workouts. No relation to public.profiles.weekly_routine, which
-- only schedules muscle groups per day, not concrete exercises/sets/reps.
--
-- exercises shape (see TemplateExercise in src/types/index.ts):
--   [{ "name": "Bench Press", "category": "CHEST", "targetSets": 4, "targetReps": 8 }, ...]
create table public.workout_templates (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  name        text not null,
  exercises   jsonb not null default '[]'::jsonb,
  created_at  timestamptz default now()
);

alter table public.workout_templates enable row level security;

create policy "Users manage own workout templates"
  on public.workout_templates
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- This project's default privileges don't extend to new tables -- see
-- 20260810010000_grant_log_tables.sql and 20260815020000_grant_achievements.sql
-- for the two prior times a missing grant here broke a feature despite RLS
-- being correct.
grant select, insert, update, delete on public.workout_templates to authenticated;
