-- XP is now awarded by the database, never by the app.
--
-- Before: the app computed XP and sent it via increment_xp(p_xp), and
-- profiles.total_xp was writable by its owner. So anyone could set their own
-- XP (PATCH total_xp) or award themselves any amount, from any client, and top
-- the leaderboard. increment_xp was also callable by logged-out (anon) callers.
--
-- After:
--   1. Triggers on the five log tables add/remove XP when a log is inserted,
--      changed or deleted, using the same formula the app used (see log_xp()).
--   2. Clients can no longer write total_xp (or created_at): INSERT/UPDATE on
--      profiles is granted per column, everything else unchanged.
--   3. increment_xp can no longer be called by clients.
-- Existing total_xp values are kept as they are.
--
-- Apply this BEFORE updating the app. Until the app update lands, the old app
-- keeps calling increment_xp: those calls now fail (the app only logs the
-- error) and the triggers award the XP, so nothing is double-counted.

-- =========================================================================
-- 1. XP formula, matching src/lib/xp.ts:
--      workout: 5 with no sets, else per set 10 + min(floor(weight / 10) * 2, 20),
--               weight in the account's display unit (lbs for imperial) as the
--               app showed it; at most 50 sets count, so a forged
--               10,000-set workout can't mint XP
--      cardio:  min(15 + minutes, 75)      meal: 5   water: 3   weigh-in: 8
--    Set weights tagged unit 'kg' are converted for imperial accounts; untagged
--    (older) sets were saved in the account's units already.
-- =========================================================================
create or replace function public.log_xp(p_table text, r jsonb, p_imperial boolean)
returns integer
language sql
immutable
set search_path = public
as $$
  select case p_table
    when 'workouts' then (
      case
        when coalesce(jsonb_typeof(r->'sets'), '') <> 'array' then 5
        when jsonb_array_length(r->'sets') = 0 then 5
        else (
          select coalesce(sum(10 + least(floor(coalesce(disp, 0) / 10) * 2, 20)), 0)::integer
          from (
            select round(
              case when s.value->>'unit' = 'kg' and p_imperial
                   then (s.value->>'weight')::numeric / 0.45359237
                   else (s.value->>'weight')::numeric end, 1) as disp
            from jsonb_array_elements(r->'sets') with ordinality as s(value, n)
            where s.n <= 50
          ) x
        )
      end)
    when 'cardio_logs' then
      least(15 + coalesce(substring(r->>'duration' from '^\s*(\d+)')::numeric, 0), 75)::integer
    when 'calorie_logs' then 5
    when 'water_logs'   then 3
    when 'weight_logs'  then 8
    else 0
  end;
$$;

revoke all on function public.log_xp(text, jsonb, boolean) from public, anon, authenticated;

-- =========================================================================
-- 2. Apply the difference between the old and new row's XP to the owner.
--    SECURITY DEFINER so it can write total_xp, which clients no longer can.
-- =========================================================================
create or replace function public.apply_log_xp()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := case when tg_op = 'DELETE' then old.user_id else new.user_id end;
  v_imperial boolean;
  v_old integer := 0;
  v_new integer := 0;
begin
  select p.units = 'imperial' into v_imperial from public.profiles p where p.id = v_user;
  v_imperial := coalesce(v_imperial, false);

  if tg_op in ('UPDATE', 'DELETE') then v_old := public.log_xp(tg_table_name, to_jsonb(old), v_imperial); end if;
  if tg_op in ('INSERT', 'UPDATE') then v_new := public.log_xp(tg_table_name, to_jsonb(new), v_imperial); end if;

  if v_new <> v_old then
    update public.profiles
    set total_xp = coalesce(total_xp, 0) + (v_new - v_old)
    where id = v_user;
  end if;
  return null;
end;
$$;

revoke all on function public.apply_log_xp() from public, anon, authenticated;

-- Only the columns XP depends on fire on update (meal/water/weight XP is flat,
-- so editing them never changes XP).
drop trigger if exists workouts_xp on public.workouts;
create trigger workouts_xp after insert or delete or update of sets on public.workouts
  for each row execute function public.apply_log_xp();

drop trigger if exists cardio_logs_xp on public.cardio_logs;
create trigger cardio_logs_xp after insert or delete or update of duration on public.cardio_logs
  for each row execute function public.apply_log_xp();

drop trigger if exists calorie_logs_xp on public.calorie_logs;
create trigger calorie_logs_xp after insert or delete on public.calorie_logs
  for each row execute function public.apply_log_xp();

drop trigger if exists water_logs_xp on public.water_logs;
create trigger water_logs_xp after insert or delete on public.water_logs
  for each row execute function public.apply_log_xp();

drop trigger if exists weight_logs_xp on public.weight_logs;
create trigger weight_logs_xp after insert or delete on public.weight_logs
  for each row execute function public.apply_log_xp();

-- =========================================================================
-- 3. Clients may write every profile column except total_xp and created_at.
--    (Live state before this: table-wide SELECT, INSERT, UPDATE; no DELETE.
--    SELECT is untouched.) id stays writable because the app's upserts send
--    it; the RLS policy still pins it to auth.uid().
-- =========================================================================
revoke insert, update on public.profiles from authenticated, anon;

grant insert (id, full_name, height_cm, weight_kg, age, goal, activity_level, units,
              reminders_enabled, weekly_routine, sex, weight_goal_type, goal_pace,
              onboarding_completed_at, dark_mode_enabled, daily_quotes_enabled,
              avatar_path, username)
  on public.profiles to authenticated;

grant update (id, full_name, height_cm, weight_kg, age, goal, activity_level, units,
              reminders_enabled, weekly_routine, sex, weight_goal_type, goal_pace,
              onboarding_completed_at, dark_mode_enabled, daily_quotes_enabled,
              avatar_path, username)
  on public.profiles to authenticated;

-- =========================================================================
-- 4. Clients can no longer award XP directly (anon included).
-- =========================================================================
revoke all on function public.increment_xp(integer) from public, anon, authenticated;
