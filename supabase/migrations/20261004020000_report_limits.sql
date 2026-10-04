-- Caps how many reports one person can file.
--
-- Before: user_reports accepted unlimited inserts, so one account could
-- flood the table you review by hand, or file the same report over and over.
--
-- After, for signed-in app users:
--   - a second open report against the same person is dropped (the first
--     one is still waiting for review);
--   - at most 20 reports per reporter per 24 hours; extras are dropped.
-- Dropped reports return success to the app, like a normal report, so a
-- spammer learns nothing and a real user never sees an error. created_at is
-- always the real time, so the window can't be dodged by backdating.
-- SECURITY DEFINER because reporters can't read user_reports themselves.

create or replace function public.limit_user_reports()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- current_user is this function's owner here (SECURITY DEFINER), so tell
  -- app users apart by their login instead. The SQL Editor has none.
  if auth.uid() is null then
    return new;
  end if;

  new.created_at := now();

  if exists (
    select 1 from public.user_reports r
    where r.reporter_id = new.reporter_id
      and r.reported_id = new.reported_id
      and r.status = 'open'
  ) then
    return null;
  end if;

  if (
    select count(*) from public.user_reports r
    where r.reporter_id = new.reporter_id
      and r.created_at > now() - interval '24 hours'
  ) >= 20 then
    return null;
  end if;

  return new;
end;
$$;

revoke all on function public.limit_user_reports() from public;

drop trigger if exists limit_user_reports on public.user_reports;
create trigger limit_user_reports before insert on public.user_reports
  for each row execute function public.limit_user_reports();

create index if not exists user_reports_reporter_idx on public.user_reports (reporter_id, created_at);
