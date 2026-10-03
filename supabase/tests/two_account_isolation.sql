-- =========================================================================
-- Two-account isolation test: can User A see or change User B's data?
--
-- Run in the Supabase SQL Editor after replacing the two emails below.
-- Safe on production: every write attempt runs inside a sub-transaction that
-- is always rolled back, even if it (wrongly) succeeds. Nothing is changed.
--
-- Give User B some data first (a workout with a photo, cardio, a meal, water,
-- a weigh-in, a custom meal, a template, a profile photo) so a "0" below
-- means "hidden from A", not "B has nothing".
--
-- Result: one row per check. Every row should be PASS, apart from KNOWN
-- ISSUE rows (tracked for a later phase) and INFO rows (by design).
-- =========================================================================

select
  set_config('test.a', coalesce((select id::text from auth.users where lower(email) = lower('USER_A_EMAIL_HERE')), 'missing'), true),
  set_config('test.b', coalesce((select id::text from auth.users where lower(email) = lower('USER_B_EMAIL_HERE')), 'missing'), true);

do $$
begin
  if current_setting('test.a') = 'missing' then raise exception 'User A email not found in auth.users'; end if;
  if current_setting('test.b') = 'missing' then raise exception 'User B email not found in auth.users'; end if;
  if current_setting('test.a') = current_setting('test.b') then raise exception 'User A and User B are the same account'; end if;
end $$;

-- What User B really has, counted with full privileges before becoming User A.
do $$
declare b uuid := current_setting('test.b')::uuid;
begin
  perform set_config('test.b_counts', jsonb_build_object(
    'profiles',          (select count(*) from public.profiles where id = b),
    'workouts',          (select count(*) from public.workouts where user_id = b),
    'cardio_logs',       (select count(*) from public.cardio_logs where user_id = b),
    'calorie_logs',      (select count(*) from public.calorie_logs where user_id = b),
    'water_logs',        (select count(*) from public.water_logs where user_id = b),
    'weight_logs',       (select count(*) from public.weight_logs where user_id = b),
    'custom_meals',      (select count(*) from public.custom_meals where user_id = b),
    'workout_templates', (select count(*) from public.workout_templates where user_id = b),
    'user_achievements', (select count(*) from public.user_achievements where user_id = b),
    'user_blocks',       (select count(*) from public.user_blocks where blocker_id = b),
    'workout_photos',    (select count(*) from storage.objects where bucket_id = 'workout-photos' and (storage.foldername(name))[1] = b::text),
    'avatars',           (select count(*) from storage.objects where bucket_id = 'avatars' and (storage.foldername(name))[1] = b::text)
  )::text, true);
end $$;

-- Become User A, exactly as the app's requests do.
select set_config('request.jwt.claims', json_build_object('sub', current_setting('test.a'), 'role', 'authenticated')::text, true);
set local role authenticated;

-- Write attempts and reads that must be refused outright. Each statement
-- runs in its own rolled-back block; we only keep how it ended.
--   kind 'cross'   : touches B's rows        -> PASS if refused or 0 rows
--   kind 'insert'  : forges a row             -> PASS only if refused
--   kind 'denyread': reads a private table    -> PASS only if refused
--   kind 'self'    : A tampering with own XP  -> KNOWN ISSUE until Phase 6
do $$
declare
  a uuid := current_setting('test.a')::uuid;
  b uuid := current_setting('test.b')::uuid;
  tests text[] := array[
    -- B's private data
    'B profile: edit name',        'cross',  format('update public.profiles set full_name = full_name where id = %L', b),
    'B profile: set XP',           'cross',  format('update public.profiles set total_xp = total_xp where id = %L', b),
    'B profile: delete',           'cross',  format('delete from public.profiles where id = %L', b),
    'B profile: create as B',      'insert', format('insert into public.profiles (id) values (%L)', b),
    'B workouts: edit',            'cross',  format('update public.workouts set notes = notes where user_id = %L', b),
    'B workouts: delete',          'cross',  format('delete from public.workouts where user_id = %L', b),
    'B workouts: add as B',        'insert', format('insert into public.workouts (user_id, name) values (%L, %L)', b, 'rls-test'),
    'B cardio: edit',              'cross',  format('update public.cardio_logs set type = type where user_id = %L', b),
    'B cardio: delete',            'cross',  format('delete from public.cardio_logs where user_id = %L', b),
    'B cardio: add as B',          'insert', format('insert into public.cardio_logs (user_id, type) values (%L, %L)', b, 'rls-test'),
    'B meals: edit',               'cross',  format('update public.calorie_logs set meal_name = meal_name where user_id = %L', b),
    'B meals: delete',             'cross',  format('delete from public.calorie_logs where user_id = %L', b),
    'B meals: add as B',           'insert', format('insert into public.calorie_logs (user_id, meal_name) values (%L, %L)', b, 'rls-test'),
    'B water: edit',               'cross',  format('update public.water_logs set amount_ml = amount_ml where user_id = %L', b),
    'B water: delete',             'cross',  format('delete from public.water_logs where user_id = %L', b),
    'B water: add as B',           'insert', format('insert into public.water_logs (user_id, amount_ml) values (%L, 1)', b),
    'B weight: edit',              'cross',  format('update public.weight_logs set weight_kg = weight_kg where user_id = %L', b),
    'B weight: delete',            'cross',  format('delete from public.weight_logs where user_id = %L', b),
    'B weight: add as B',          'insert', format('insert into public.weight_logs (user_id, weight_kg) values (%L, 1)', b),
    'B custom meals: edit',        'cross',  format('update public.custom_meals set name = name where user_id = %L', b),
    'B custom meals: delete',      'cross',  format('delete from public.custom_meals where user_id = %L', b),
    'B custom meals: add as B',    'insert', format('insert into public.custom_meals (user_id, name, calories) values (%L, %L, 1)', b, 'rls-test'),
    'B templates: edit',           'cross',  format('update public.workout_templates set name = name where user_id = %L', b),
    'B templates: delete',         'cross',  format('delete from public.workout_templates where user_id = %L', b),
    'B templates: add as B',       'insert', format('insert into public.workout_templates (user_id, name) values (%L, %L)', b, 'rls-test'),
    -- Social / moderation
    'B blocks: remove',            'cross',  format('delete from public.user_blocks where blocker_id = %L', b),
    'Forge a block by B',          'insert', format('insert into public.user_blocks (blocker_id, blocked_id) values (%L, %L)', b, a),
    'Forge a report by B',         'insert', format('insert into public.user_reports (reporter_id, reported_id, reason) values (%L, %L, %L)', b, a, 'other'),
    'Forge friendship with B',     'insert', format('insert into public.friendships (requester_id, addressee_id, status) values (%L, %L, %L)', b, a, 'accepted'),
    'Grant self an achievement',   'insert', format('insert into public.user_achievements (user_id, achievement_key) values (%L, %L)', a, 'level_10'),
    'Un-hide self from moderation', 'cross',  format('delete from public.hidden_users where user_id = %L', a),
    'Read user reports',           'denyread', 'select 1 from public.user_reports limit 1',
    'Read hidden users',           'denyread', 'select 1 from public.hidden_users limit 1',
    'Read login lockout table',    'denyread', 'select 1 from public.password_failed_verification_attempts limit 1',
    -- A's own XP (audit finding, fixed in Phase 6)
    'Set own XP directly',         'self',   format('update public.profiles set total_xp = total_xp where id = %L', a),
    'Award self any XP amount',    'self',   'select public.increment_xp(0)'
  ];
  results jsonb := '{}';
  i int;
  n bigint;
  msg text;
  outcome text;
begin
  for i in 1 .. array_length(tests, 1) / 3 loop
    begin
      execute tests[i * 3];
      get diagnostics n = row_count;
      raise exception using message = 'OK:' || n;
    exception when others then
      msg := sqlerrm;
    end;
    -- A typo'd column/table would also "fail" — don't let it pass as refused.
    outcome := case when msg like '%does not exist%' or msg like '%syntax error%' then 'TEST ERROR: ' || msg
      else case tests[i * 3 - 1]
      when 'cross' then case
        when msg = 'OK:0' then 'PASS: 0 rows affected'
        when msg like 'OK:%' then 'FAIL: ' || substr(msg, 4) || ' row(s) affected'
        else 'PASS: refused (' || msg || ')' end
      when 'insert' then case
        when msg like 'OK:%' then 'FAIL: row was accepted'
        else 'PASS: refused (' || msg || ')' end
      when 'denyread' then case
        when msg like 'OK:%' then 'FAIL: table is readable'
        else 'PASS: refused (' || msg || ')' end
      when 'self' then case
        when msg like 'OK:%' and msg <> 'OK:0' then 'KNOWN ISSUE: allowed (fix in Phase 6)'
        else 'PASS: refused (' || msg || ')' end
      end
    end;
    results := results || jsonb_build_object(tests[i * 3 - 2], outcome);
  end loop;
  perform set_config('test.results', results::text, true);
end $$;

-- Reads as User A, plus the outcomes above, in one table. Failures first.
with
  b  as (select current_setting('test.b')::uuid as id),
  bc as (select current_setting('test.b_counts')::jsonb as j),
  reads(check_name, b_has, a_sees) as (
    select 'Read B profile',         (select j->>'profiles' from bc),          (select count(*) from public.profiles, b where profiles.id = b.id)
    union all select 'Read B workouts',        (select j->>'workouts' from bc),          (select count(*) from public.workouts, b where user_id = b.id)
    union all select 'Read B cardio',          (select j->>'cardio_logs' from bc),       (select count(*) from public.cardio_logs, b where user_id = b.id)
    union all select 'Read B meals',           (select j->>'calorie_logs' from bc),      (select count(*) from public.calorie_logs, b where user_id = b.id)
    union all select 'Read B water',           (select j->>'water_logs' from bc),        (select count(*) from public.water_logs, b where user_id = b.id)
    union all select 'Read B weight',          (select j->>'weight_logs' from bc),       (select count(*) from public.weight_logs, b where user_id = b.id)
    union all select 'Read B custom meals',    (select j->>'custom_meals' from bc),      (select count(*) from public.custom_meals, b where user_id = b.id)
    union all select 'Read B templates',       (select j->>'workout_templates' from bc), (select count(*) from public.workout_templates, b where user_id = b.id)
    union all select 'Read B achievements',    (select j->>'user_achievements' from bc), (select count(*) from public.user_achievements, b where user_id = b.id)
    union all select 'Read B blocks',          (select j->>'user_blocks' from bc),       (select count(*) from public.user_blocks, b where blocker_id = b.id)
    union all select 'List B workout photos',  (select j->>'workout_photos' from bc),    (select count(*) from storage.objects, b where bucket_id = 'workout-photos' and (storage.foldername(name))[1] = b.id::text)
    union all select 'List B avatar files',    (select j->>'avatars' from bc),           (select count(*) from storage.objects, b where bucket_id = 'avatars' and (storage.foldername(name))[1] = b.id::text)
    union all select 'B friend profile (not friends)', 'n/a',                            (select count(*) from b, public.get_friend_profile(b.id))
  ),
  rows_out as (
    select check_name,
           case when a_sees = 0 then 'PASS: B has ' || b_has || ', A sees 0'
                else 'FAIL: B has ' || b_has || ', A sees ' || a_sees end as outcome
    from reads
    union all
    select 'B on global leaderboard (name + photo)',
           case when exists (select 1 from b, public.get_level_leaderboard(200, false) l where l.user_id = b.id)
                then 'INFO: visible by design (name, photo, level only); privacy reviewed in Phase 8'
                else 'INFO: not in top 200' end
    union all
    select key, value from jsonb_each_text(current_setting('test.results')::jsonb)
  )
select split_part(outcome, ':', 1) as status, check_name, outcome as detail
from rows_out
order by case split_part(outcome, ':', 1) when 'TEST ERROR' then 0 when 'FAIL' then 0 when 'KNOWN ISSUE' then 1 when 'INFO' then 2 else 3 end, check_name;
