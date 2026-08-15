-- Achievements: a catalog table (achievements) + per-user unlock records
-- (user_achievements), checked/awarded server-side via
-- check_and_unlock_achievements() rather than the client deciding for
-- itself what it has earned.
--
-- user_achievements deliberately does NOT get an insert/update policy like
-- the log tables do (workouts, cardio_logs, etc. use `for all using
-- (auth.uid() = user_id)`). If it did, any authenticated user could POST a
-- fake unlock straight at the REST API for an achievement they never
-- earned. The only writer is the SECURITY DEFINER function below, which
-- computes eligibility itself rather than trusting client input.

create table public.achievements (
  key          text primary key,
  name         text not null,
  description  text not null,
  icon         text not null,
  category     text not null,
  sort_order   integer not null
);

alter table public.achievements enable row level security;

-- Public reference data — every user needs to see the full catalog
-- (including locked entries) to render a browsing screen.
create policy "Authenticated users can read the achievement catalog"
  on public.achievements
  for select
  to authenticated
  using (true);

create table public.user_achievements (
  user_id          uuid not null references auth.users (id) on delete cascade,
  achievement_key  text not null references public.achievements (key) on delete cascade,
  unlocked_at      timestamptz not null default now(),
  primary key (user_id, achievement_key)
);

alter table public.user_achievements enable row level security;

create policy "Users can view their own unlocked achievements"
  on public.user_achievements
  for select
  using (auth.uid() = user_id);

insert into public.achievements (key, name, description, icon, category, sort_order) values
  ('first_workout',  'First Rep',        'Log your first workout.',            'barbell-outline',    'strength',    10),
  ('workouts_10',    'Iron Regular',     'Log 10 workouts.',                   'barbell-outline',    'strength',    20),
  ('workouts_50',    'Iron Veteran',     'Log 50 workouts.',                   'barbell',            'strength',    30),
  ('first_cardio',   'First Mile',       'Log your first cardio session.',     'heart-outline',      'cardio',      40),
  ('cardio_25',      'Cardio Regular',   'Log 25 cardio sessions.',            'heart',              'cardio',      50),
  ('first_meal',     'First Meal',       'Log your first meal.',               'nutrition-outline',  'nutrition',   60),
  ('meals_50',       'Meal Tracker',     'Log 50 meals.',                      'nutrition',          'nutrition',   70),
  ('hydration_25',   'Hydrated',         'Log water 25 times.',                'water-outline',      'hydration',   80),
  ('weighins_10',    'Weigh-In Habit',   'Log your weight 10 times.',          'body-outline',       'consistency', 90),
  ('streak_7',       'Week One',         'Reach a 7-day workout streak.',      'flame-outline',      'consistency', 100),
  ('streak_30',      'Locked In',        'Reach a 30-day workout streak.',     'flame',               'consistency', 110),
  ('level_5',        'Leveling Up',      'Reach Level 5.',                     'trophy-outline',     'level',       120),
  ('level_10',       'Veteran',          'Reach Level 10.',                    'trophy',             'level',       130);

-- Computes the caller's stats, inserts any newly-qualified achievement
-- (idempotent via on conflict do nothing), and returns only the rows this
-- call actually inserted — so the client knows exactly what to show an
-- "unlocked" banner for without separately tracking what was already known.
create or replace function public.check_and_unlock_achievements()
returns table (key text, name text, description text, icon text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_workout_count integer;
  v_cardio_count integer;
  v_meal_count integer;
  v_water_count integer;
  v_weight_count integer;
  v_current_streak integer;
  v_level integer;
begin
  select count(*) into v_workout_count from public.workouts where user_id = v_user;
  select count(*) into v_cardio_count from public.cardio_logs where user_id = v_user;
  select count(*) into v_meal_count from public.calorie_logs where user_id = v_user;
  select count(*) into v_water_count from public.water_logs where user_id = v_user;
  select count(*) into v_weight_count from public.weight_logs where user_id = v_user;

  select s.current_streak into v_current_streak from public.get_my_workout_streak() s;
  v_current_streak := coalesce(v_current_streak, 0);

  select floor(sqrt(greatest(coalesce(p.total_xp, 0), 0) / 100.0))::integer
    into v_level
    from public.profiles p
    where p.id = v_user;
  v_level := coalesce(v_level, 0);

  return query
  with newly_unlocked as (
    insert into public.user_achievements (user_id, achievement_key)
    select v_user, a.key
    from public.achievements a
    where (
      (a.key = 'first_workout' and v_workout_count >= 1)  or
      (a.key = 'workouts_10'   and v_workout_count >= 10) or
      (a.key = 'workouts_50'   and v_workout_count >= 50) or
      (a.key = 'first_cardio'  and v_cardio_count  >= 1)  or
      (a.key = 'cardio_25'     and v_cardio_count  >= 25) or
      (a.key = 'first_meal'    and v_meal_count    >= 1)  or
      (a.key = 'meals_50'      and v_meal_count    >= 50) or
      (a.key = 'hydration_25'  and v_water_count   >= 25) or
      (a.key = 'weighins_10'   and v_weight_count  >= 10) or
      (a.key = 'streak_7'      and v_current_streak >= 7)  or
      (a.key = 'streak_30'     and v_current_streak >= 30) or
      (a.key = 'level_5'       and v_level >= 5)  or
      (a.key = 'level_10'      and v_level >= 10)
    )
    on conflict (user_id, achievement_key) do nothing
    returning achievement_key
  )
  select a.key, a.name, a.description, a.icon
  from newly_unlocked nu
  join public.achievements a on a.key = nu.achievement_key;
end;
$$;

revoke all on function public.check_and_unlock_achievements() from public;
grant execute on function public.check_and_unlock_achievements() to authenticated;
