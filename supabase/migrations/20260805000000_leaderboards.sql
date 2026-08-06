-- Leaderboards: global rankings by level (total_xp) and by log frequency for
-- strength (workouts) and cardio (cardio_logs) — counts of *sessions logged*,
-- not weight lifted or pace, so there's nothing for a user to self-report
-- that inflates their rank beyond "I showed up and logged it".
--
-- Every table involved (profiles, workouts, cardio_logs) has RLS locked to
-- `auth.uid() = user_id` (see baseline_schema.sql), so a user cannot
-- normally SELECT another user's row at all. Rather than loosening that RLS
-- — which would let any user read every other user's weight_kg, age, goal,
-- notes, etc. — these are narrow SECURITY DEFINER functions: they run with
-- elevated privilege internally, but the RETURNS TABLE signature is the
-- only thing ever exposed to callers (a name and an aggregate number,
-- nothing else). limit_count is capped at 200 server-side regardless of
-- what a client passes in.

-- =========================================================================
-- Top N by level (profiles.total_xp)
-- =========================================================================
create or replace function public.get_level_leaderboard(limit_count integer default 50)
returns table (user_id uuid, full_name text, total_xp integer, level integer, rnk bigint)
language sql
security definer
set search_path = public
stable
as $$
  select
    p.id as user_id,
    p.full_name,
    coalesce(p.total_xp, 0) as total_xp,
    floor(sqrt(greatest(coalesce(p.total_xp, 0), 0) / 100.0))::integer as level,
    rank() over (order by coalesce(p.total_xp, 0) desc) as rnk
  from public.profiles p
  order by total_xp desc
  limit least(coalesce(limit_count, 50), 200);
$$;

revoke all on function public.get_level_leaderboard(integer) from public;
grant execute on function public.get_level_leaderboard(integer) to authenticated;

-- Caller's own level rank, even when outside the top N returned above.
create or replace function public.get_my_level_rank()
returns table (rnk bigint, total_xp integer, level integer)
language sql
security definer
set search_path = public
stable
as $$
  select ranked.rnk, ranked.total_xp, ranked.level
  from (
    select
      p.id,
      coalesce(p.total_xp, 0) as total_xp,
      floor(sqrt(greatest(coalesce(p.total_xp, 0), 0) / 100.0))::integer as level,
      rank() over (order by coalesce(p.total_xp, 0) desc) as rnk
    from public.profiles p
  ) ranked
  where ranked.id = auth.uid();
$$;

revoke all on function public.get_my_level_rank() from public;
grant execute on function public.get_my_level_rank() to authenticated;

-- =========================================================================
-- Top N by strength sessions logged (row count in public.workouts per user)
-- =========================================================================
create or replace function public.get_strength_leaderboard(limit_count integer default 50)
returns table (user_id uuid, full_name text, log_count bigint, rnk bigint)
language sql
security definer
set search_path = public
stable
as $$
  select
    w.user_id,
    p.full_name,
    count(*) as log_count,
    rank() over (order by count(*) desc) as rnk
  from public.workouts w
  join public.profiles p on p.id = w.user_id
  group by w.user_id, p.full_name
  order by log_count desc
  limit least(coalesce(limit_count, 50), 200);
$$;

revoke all on function public.get_strength_leaderboard(integer) from public;
grant execute on function public.get_strength_leaderboard(integer) to authenticated;

-- Caller's own strength rank — LEFT JOIN so a user with zero workouts still
-- gets a (last-place) rank back instead of no row at all.
create or replace function public.get_my_strength_rank()
returns table (rnk bigint, log_count bigint)
language sql
security definer
set search_path = public
stable
as $$
  select ranked.rnk, ranked.log_count
  from (
    select
      p.id,
      count(w.id) as log_count,
      rank() over (order by count(w.id) desc) as rnk
    from public.profiles p
    left join public.workouts w on w.user_id = p.id
    group by p.id
  ) ranked
  where ranked.id = auth.uid();
$$;

revoke all on function public.get_my_strength_rank() from public;
grant execute on function public.get_my_strength_rank() to authenticated;

-- =========================================================================
-- Top N by cardio sessions logged (row count in public.cardio_logs per user)
-- =========================================================================
create or replace function public.get_cardio_leaderboard(limit_count integer default 50)
returns table (user_id uuid, full_name text, log_count bigint, rnk bigint)
language sql
security definer
set search_path = public
stable
as $$
  select
    c.user_id,
    p.full_name,
    count(*) as log_count,
    rank() over (order by count(*) desc) as rnk
  from public.cardio_logs c
  join public.profiles p on p.id = c.user_id
  group by c.user_id, p.full_name
  order by log_count desc
  limit least(coalesce(limit_count, 50), 200);
$$;

revoke all on function public.get_cardio_leaderboard(integer) from public;
grant execute on function public.get_cardio_leaderboard(integer) to authenticated;

-- Caller's own cardio rank — same LEFT JOIN reasoning as strength above.
create or replace function public.get_my_cardio_rank()
returns table (rnk bigint, log_count bigint)
language sql
security definer
set search_path = public
stable
as $$
  select ranked.rnk, ranked.log_count
  from (
    select
      p.id,
      count(c.id) as log_count,
      rank() over (order by count(c.id) desc) as rnk
    from public.profiles p
    left join public.cardio_logs c on c.user_id = p.id
    group by p.id
  ) ranked
  where ranked.id = auth.uid();
$$;

revoke all on function public.get_my_cardio_rank() from public;
grant execute on function public.get_my_cardio_rank() to authenticated;
