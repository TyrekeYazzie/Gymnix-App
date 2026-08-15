-- Streak leaderboard: ranks users by *current* workout streak (not longest),
-- reusing the gaps-and-islands logic from get_my_workout_streak() (see
-- supabase/migrations/20260814010000_workout_streak.sql) but computed
-- across all users at once instead of scoped to the caller. Same narrow
-- SECURITY DEFINER RETURNS TABLE pattern as
-- supabase/migrations/20260805000000_leaderboards.sql.
create or replace function public.get_streak_leaderboard(limit_count integer default 50)
returns table (user_id uuid, full_name text, current_streak integer, rnk bigint)
language sql
security definer
set search_path = public
stable
as $$
  with logged_days as (
    select distinct user_id, (created_at at time zone 'utc')::date as log_date
    from public.workouts
  ),
  islands as (
    select
      user_id,
      log_date,
      log_date - (row_number() over (partition by user_id order by log_date))::integer as island
    from logged_days
  ),
  streaks as (
    select user_id, max(log_date) as streak_end, count(*)::integer as streak_len
    from islands
    group by user_id, island
  ),
  current_streaks as (
    select distinct on (user_id) user_id, streak_len as current_streak
    from streaks
    where streak_end >= (now() at time zone 'utc')::date - 1
    order by user_id, streak_end desc
  )
  select
    p.id as user_id,
    p.full_name,
    coalesce(cs.current_streak, 0) as current_streak,
    rank() over (order by coalesce(cs.current_streak, 0) desc) as rnk
  from public.profiles p
  left join current_streaks cs on cs.user_id = p.id
  order by current_streak desc
  limit least(coalesce(limit_count, 50), 200);
$$;

revoke all on function public.get_streak_leaderboard(integer) from public;
grant execute on function public.get_streak_leaderboard(integer) to authenticated;

-- Caller's own streak rank, same reasoning as get_my_strength_rank/get_my_cardio_rank.
create or replace function public.get_my_streak_rank()
returns table (rnk bigint, current_streak integer)
language sql
security definer
set search_path = public
stable
as $$
  with logged_days as (
    select distinct user_id, (created_at at time zone 'utc')::date as log_date
    from public.workouts
  ),
  islands as (
    select
      user_id,
      log_date,
      log_date - (row_number() over (partition by user_id order by log_date))::integer as island
    from logged_days
  ),
  streaks as (
    select user_id, max(log_date) as streak_end, count(*)::integer as streak_len
    from islands
    group by user_id, island
  ),
  current_streaks as (
    select distinct on (user_id) user_id, streak_len as current_streak
    from streaks
    where streak_end >= (now() at time zone 'utc')::date - 1
    order by user_id, streak_end desc
  ),
  ranked as (
    select
      p.id,
      coalesce(cs.current_streak, 0) as current_streak,
      rank() over (order by coalesce(cs.current_streak, 0) desc) as rnk
    from public.profiles p
    left join current_streaks cs on cs.user_id = p.id
  )
  select ranked.rnk, ranked.current_streak
  from ranked
  where ranked.id = auth.uid();
$$;

revoke all on function public.get_my_streak_rank() from public;
grant execute on function public.get_my_streak_rank() to authenticated;
