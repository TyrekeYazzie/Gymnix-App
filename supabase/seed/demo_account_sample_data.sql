-- Demo account sample data (App Store review + screenshots)
--
-- Fills ONE account with about two weeks of realistic logs: push/pull/legs
-- workouts with weights creeping up (so PRs and a streak show), cardio,
-- meals, water, weigh-ins and two workout templates. Times are placed in the
-- account's own time zone, and nothing is dated in the future.
--
-- How to run: create the account in the app first (sign up, pick a
-- username, finish onboarding). If it isn't gymnixsupport+demo@gmail.com,
-- find-and-replace that address everywhere in this file. Then paste the
-- whole file into Supabase → SQL Editor → Run. It stops without changing anything
-- if the email has no account or the account already has logs.

create or replace function pg_temp.demo_ts(p_day date, p_tz text, p_hhmm text)
returns timestamptz language sql immutable as $$
  select (p_day + p_hhmm::time) at time zone p_tz
$$;

do $$
declare
  v_email text := 'gymnixsupport+demo@gmail.com';  -- ← the demo account's email
  v_uid   uuid;
  v_tz    text;
  v_today date;
begin
  select id into v_uid from auth.users where lower(email) = lower(v_email);
  if v_uid is null then
    raise exception 'No Gymnix account uses %. Check v_email at the top of the script.', v_email;
  end if;

  if exists (select 1 from public.workouts     where user_id = v_uid)
  or exists (select 1 from public.cardio_logs  where user_id = v_uid)
  or exists (select 1 from public.calorie_logs where user_id = v_uid)
  or exists (select 1 from public.water_logs   where user_id = v_uid)
  or exists (select 1 from public.weight_logs  where user_id = v_uid) then
    raise exception '% already has logs. This script only fills an empty account.', v_email;
  end if;

  select coalesce(time_zone, 'UTC') into v_tz from public.profiles where id = v_uid;
  v_tz    := coalesce(v_tz, 'UTC');
  v_today := (now() at time zone v_tz)::date;

  -- Workouts: one row per exercise, like the app saves them. Sessions on
  -- days 0–3 in a row make a 4-day streak; each split's weights rise every
  -- session. Today's session is moved before now if 6pm hasn't come yet.
  insert into public.workouts (user_id, name, category, duration, calories, sets, created_at)
  select v_uid, e.name, e.category, '15 min', 0,
         (select jsonb_agg(jsonb_build_object('reps', r, 'weight', e.base + e.step * s.p, 'unit', 'kg') order by i)
            from unnest(e.reps) with ordinality as u(r, i)),
         least(pg_temp.demo_ts(v_today - s.d, v_tz, '18:00') + make_interval(mins => 12 * e.ord),
               now() - make_interval(mins => 60 - 12 * e.ord))
  from (values (13, 'push', 1), (12, 'pull', 1), (10, 'legs', 1),
               ( 9, 'push', 2), ( 8, 'pull', 2), ( 6, 'legs', 2),
               ( 5, 'push', 3), ( 3, 'pull', 3), ( 2, 'legs', 3),
               ( 1, 'push', 4), ( 0, 'pull', 4)) as s(d, split, p)
  join (values
    ('push', 1, 'Bench Press',       'CHEST',      70.0, 2.5,  array[8, 8, 7]),
    ('push', 2, 'Overhead Press',    'SHOULDERS',  40.0, 1.25, array[8, 8, 6]),
    ('push', 3, 'Incline Press',     'CHEST',      55.0, 2.5,  array[10, 9, 8]),
    ('push', 4, 'Tricep Extension',  'ARMS',       20.0, 1.0,  array[12, 12, 10]),
    ('pull', 1, 'Deadlift',          'BACK',      120.0, 5.0,  array[5, 5, 5]),
    ('pull', 2, 'Lat Pulldown',      'BACK',       55.0, 2.5,  array[10, 10, 9]),
    ('pull', 3, 'Bent-Over Row',     'BACK',       60.0, 2.5,  array[8, 8, 8]),
    ('pull', 4, 'Bicep Curl',        'ARMS',       12.0, 1.0,  array[12, 10, 10]),
    ('legs', 1, 'Squat',             'LEGS',       95.0, 5.0,  array[6, 6, 6, 5]),
    ('legs', 2, 'Romanian Deadlift', 'LEGS',       80.0, 5.0,  array[8, 8, 8]),
    ('legs', 3, 'Leg Press',         'LEGS',      160.0, 10.0, array[12, 12, 10]),
    ('legs', 4, 'Crunches',          'ABS',         0.0, 0.0,  array[20, 20, 20])
  ) as e(split, ord, name, category, base, step, reps) on e.split = s.split;

  insert into public.cardio_logs (user_id, type, distance_km, duration, calories, created_at)
  select v_uid, c.type, c.km, c.mins || ' min', c.cal, pg_temp.demo_ts(v_today - c.d, v_tz, c.hhmm)
  from (values (11, 'Run',  5.0,  29, 380, '07:10'),
               ( 7, 'Bike', 14.2, 40, 410, '07:30'),
               ( 4, 'HIIT', 0.0,  20, 260, '18:00'),
               ( 2, 'Walk', 3.2,  38, 170, '12:30'),
               ( 0, 'Run',  5.2,  28, 390, '07:10')) as c(d, type, km, mins, cal, hhmm)
  where pg_temp.demo_ts(v_today - c.d, v_tz, c.hhmm) < now();

  -- Water: 2.5 L most days, 2 L every fourth day.
  insert into public.water_logs (user_id, amount_ml, created_at)
  select v_uid, w.ml, pg_temp.demo_ts(v_today - g.d, v_tz, w.hhmm)
  from generate_series(0, 13) as g(d)
  cross join (values ('08:00', 500), ('10:30', 250), ('12:30', 500),
                     ('15:00', 500), ('17:30', 250), ('20:00', 500)) as w(hhmm, ml)
  where not (g.d % 4 = 1 and w.hhmm = '20:00')
    and pg_temp.demo_ts(v_today - g.d, v_tz, w.hhmm) < now();

  -- Meals: three rotating menus; the afternoon snack is skipped some days.
  insert into public.calorie_logs (user_id, meal_name, meal_type, calories, protein_g, carbs_g, fat_g, created_at)
  select v_uid, m.name, m.type, m.cal, m.p, m.c, m.f, pg_temp.demo_ts(v_today - g.d, v_tz, m.hhmm)
  from generate_series(0, 13) as g(d)
  join (values
    (0, 'Breakfast', '08:00', 'Oatmeal with Berries',   350, 12, 60, 7),
    (1, 'Breakfast', '08:00', 'Eggs & Toast',           420, 26, 30, 20),
    (2, 'Breakfast', '08:00', 'Greek Yogurt Bowl',      320, 24, 38, 8),
    (0, 'Lunch',     '12:45', 'Chicken Rice Bowl',      560, 45, 62, 12),
    (1, 'Lunch',     '12:45', 'Turkey Wrap',            480, 34, 45, 16),
    (2, 'Lunch',     '12:45', 'Tuna Salad',             410, 38, 18, 20),
    (0, 'Snack',     '16:00', 'Protein Shake',          180, 25, 8,  3),
    (1, 'Snack',     '16:00', 'Banana & Peanut Butter', 290, 8,  34, 14),
    (2, 'Snack',     '16:00', 'Almonds',                170, 6,  6,  15),
    (0, 'Dinner',    '19:30', 'Salmon & Potatoes',      640, 42, 55, 24),
    (1, 'Dinner',    '19:30', 'Steak & Vegetables',     620, 48, 22, 36),
    (2, 'Dinner',    '19:30', 'Pasta Bolognese',        700, 38, 85, 20)
  ) as m(k, type, hhmm, name, cal, p, c, f) on m.k = g.d % 3
  where not (m.type = 'Snack' and g.d % 5 = 2)
    and pg_temp.demo_ts(v_today - g.d, v_tz, m.hhmm) < now();

  -- Weigh-ins: a slow, slightly noisy downward trend.
  insert into public.weight_logs (user_id, weight_kg, created_at)
  select v_uid, w.kg, pg_temp.demo_ts(v_today - w.d, v_tz, '07:00')
  from (values (13, 82.6), (11, 82.4), (9, 82.5), (7, 82.1),
               ( 5, 81.9), ( 3, 81.8), (1, 81.5), (0, 81.4)) as w(d, kg)
  where pg_temp.demo_ts(v_today - w.d, v_tz, '07:00') < now();

  insert into public.workout_templates (user_id, name, exercises)
  values
    (v_uid, 'Push Day', '[{"name":"Bench Press","category":"CHEST","targetSets":3,"targetReps":8},
                          {"name":"Overhead Press","category":"SHOULDERS","targetSets":3,"targetReps":8},
                          {"name":"Incline Press","category":"CHEST","targetSets":3,"targetReps":10},
                          {"name":"Tricep Extension","category":"ARMS","targetSets":3,"targetReps":12}]'),
    (v_uid, 'Leg Day',  '[{"name":"Squat","category":"LEGS","targetSets":4,"targetReps":6},
                          {"name":"Romanian Deadlift","category":"LEGS","targetSets":3,"targetReps":8},
                          {"name":"Leg Press","category":"LEGS","targetSets":3,"targetReps":12},
                          {"name":"Crunches","category":"ABS","targetSets":3,"targetReps":20}]');

  -- Unlock whatever achievements this data has earned. If that fails, the
  -- app unlocks them on the account's next log anyway.
  begin
    perform set_config('request.jwt.claims', json_build_object('sub', v_uid, 'role', 'authenticated')::text, true);
    perform public.check_and_unlock_achievements();
  exception when others then
    raise notice 'Achievements will unlock on the next log in the app (%).', sqlerrm;
  end;

  raise notice 'Done: % now has sample data.', v_email;
end $$;

-- Check the result (should list about 44 workouts, 4–5 cardio sessions,
-- ~80 water logs, ~50 meals, 7–8 weigh-ins and 2 templates).
select
  (select count(*) from public.workouts          w join auth.users u on u.id = w.user_id where lower(u.email) = lower('gymnixsupport+demo@gmail.com')) as workouts,
  (select count(*) from public.cardio_logs       c join auth.users u on u.id = c.user_id where lower(u.email) = lower('gymnixsupport+demo@gmail.com')) as cardio,
  (select count(*) from public.water_logs        w join auth.users u on u.id = w.user_id where lower(u.email) = lower('gymnixsupport+demo@gmail.com')) as water,
  (select count(*) from public.calorie_logs      m join auth.users u on u.id = m.user_id where lower(u.email) = lower('gymnixsupport+demo@gmail.com')) as meals,
  (select count(*) from public.weight_logs       w join auth.users u on u.id = w.user_id where lower(u.email) = lower('gymnixsupport+demo@gmail.com')) as weigh_ins,
  (select count(*) from public.workout_templates t join auth.users u on u.id = t.user_id where lower(u.email) = lower('gymnixsupport+demo@gmail.com')) as templates,
  (select total_xp from public.profiles p join auth.users u on u.id = p.id where lower(u.email) = lower('gymnixsupport+demo@gmail.com')) as total_xp;
