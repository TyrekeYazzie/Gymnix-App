-- Baseline capture of the production schema as it existed on 2026-07-27.
-- Reconstructed from live introspection (information_schema, pg_policies,
-- pg_proc) since this project previously had no version-controlled schema.
-- Two details below are inferred from Supabase's standard auth-trigger
-- pattern rather than direct introspection (introspection was inconclusive
-- because the referenced table lives in the `auth` schema):
--   1. FK targets are `auth.users(id)` with `on delete cascade`.
--   2. `handle_new_user()` is `security definer` (required for a trigger on
--      auth.users to insert into public.profiles, since RLS is enabled and
--      there is no auth.uid() session during signup).
-- If you ever get `supabase db pull` working, diff its output against this
-- file and fix anything that doesn't match.

create extension if not exists pgcrypto;

-- =========================================================================
-- profiles
-- =========================================================================
create table public.profiles (
  id                 uuid primary key references auth.users (id) on delete cascade,
  full_name          text,
  height_cm          integer,
  weight_kg          numeric,
  age                integer,
  goal               text,
  activity_level     text,
  units              text default 'metric'::text,
  reminders_enabled  boolean not null default true,
  total_xp           integer default 0,
  created_at         timestamptz default now()
);

alter table public.profiles enable row level security;

create policy "Users can manage their own data"
  on public.profiles
  for all
  using (auth.uid() = id);

-- =========================================================================
-- workouts
-- =========================================================================
create table public.workouts (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  name        text not null,
  category    text,
  duration    text,
  calories    integer default 0,
  notes       text,
  sets        jsonb default '[]'::jsonb,
  created_at  timestamptz default now()
);

alter table public.workouts enable row level security;

create policy "Users manage own workouts"
  on public.workouts
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- =========================================================================
-- calorie_logs
-- =========================================================================
create table public.calorie_logs (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  meal_name   text not null,
  meal_type   text,
  calories    integer default 0,
  protein_g   numeric,
  carbs_g     numeric,
  fat_g       numeric,
  created_at  timestamptz default now()
);

alter table public.calorie_logs enable row level security;

create policy "Users manage own calorie logs"
  on public.calorie_logs
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- =========================================================================
-- cardio_logs
-- =========================================================================
create table public.cardio_logs (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users (id) on delete cascade,
  type          text not null,
  distance_km   numeric,
  duration      text,
  calories      integer default 0,
  created_at    timestamptz default now()
);

alter table public.cardio_logs enable row level security;

create policy "Users manage own cardio logs"
  on public.cardio_logs
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- =========================================================================
-- water_logs
-- =========================================================================
create table public.water_logs (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  amount_ml   integer not null,
  created_at  timestamptz default now()
);

alter table public.water_logs enable row level security;

create policy "Users manage own water logs"
  on public.water_logs
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- =========================================================================
-- weight_logs
-- =========================================================================
create table public.weight_logs (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  weight_kg   numeric not null,
  notes       text,
  created_at  timestamptz default now()
);

alter table public.weight_logs enable row level security;

create policy "Users manage own weight logs"
  on public.weight_logs
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- =========================================================================
-- Auto-create a profile row when a new auth user signs up.
-- =========================================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, units)
  values (new.id, new.raw_user_meta_data->>'full_name', 'metric')
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
