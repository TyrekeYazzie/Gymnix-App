-- Logs can be added for a past day, up to 7 days back, never in the future.
--
-- Before: created_at on the five log tables was freely writable by clients
-- (table-level INSERT/UPDATE, 20260810010000_grant_log_tables.sql). The app
-- never set it, but anyone calling the API could backdate or future-date
-- logs at will: fill in a year of daily workouts to top the streak board,
-- or move an existing log to another day.
--
-- After: the app lets you add a log for one of the last 7 days from the
-- Calendar. On insert, created_at must fall between 7 days ago and now,
-- with margins for clock skew and the extra hour when daylight saving
-- ends; blank means now. On update, created_at can't change. Only
-- enforced for app users (the anon/authenticated roles), so the SQL
-- Editor and service-role maintenance are unaffected.

create or replace function public.guard_log_created_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if current_user not in ('authenticated', 'anon') then
    return new;
  end if;

  if tg_op = 'UPDATE' then
    new.created_at := old.created_at;
    return new;
  end if;

  if new.created_at is null then
    new.created_at := now();
  elsif new.created_at > now() + interval '5 minutes' then
    raise exception 'A log can''t be dated in the future.' using errcode = '22023';
  elsif new.created_at < now() - interval '7 days 2 hours' then
    raise exception 'Logs can only be added up to 7 days back.' using errcode = '22023';
  end if;
  return new;
end;
$$;

do $$
declare
  t text;
begin
  foreach t in array array['workouts', 'cardio_logs', 'calorie_logs', 'water_logs', 'weight_logs'] loop
    execute format('drop trigger if exists guard_log_created_at on public.%I', t);
    execute format(
      'create trigger guard_log_created_at before insert or update on public.%I
         for each row execute function public.guard_log_created_at()', t);
  end loop;
end;
$$;
