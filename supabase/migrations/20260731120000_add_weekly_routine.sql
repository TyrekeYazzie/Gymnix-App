-- Adds a per-user weekly training split, e.g. { "monday": "CHEST", "tuesday": "BACK" }.
-- Missing/null day keys mean rest day. Values are the same category strings used
-- by public.workouts.category (CHEST/BACK/LEGS/SHOULDERS/ARMS/ABS).

alter table public.profiles
  add column weekly_routine jsonb not null default '{}'::jsonb;
