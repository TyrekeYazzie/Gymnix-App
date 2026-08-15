-- Server-side workout streak, replacing the client-side calculation in
-- dashboard.tsx (loadDashboard). That version queried only the last 7 days
-- of workouts, then walked backward counting consecutive days — so the
-- displayed streak could never exceed 7 regardless of how long the user's
-- real streak was. This computes an unbounded streak in the database via a
-- classic gaps-and-islands query and returns just two integers, matching
-- the narrow-surface-area pattern established in
-- supabase/migrations/20260805000000_leaderboards.sql.
--
-- Scope: workout logs only (public.workouts), matching the existing UI
-- copy ("Keep logging workouts daily to build your streak") — cardio/
-- water/calorie logs intentionally do not count toward this streak.
--
-- Days are bucketed by UTC calendar date via `created_at at time zone
-- 'utc'`, not device-local date. This is a deliberate, accepted behavior
-- change from the old client-side version (which used device-local
-- toDateString()): a workout logged at 11pm PST and one logged at 2am PST
-- the same local night now land on different streak-days if they cross a
-- UTC boundary. Acceptable for v1; revisit if it causes user complaints.
create or replace function public.get_my_workout_streak()
returns table (current_streak integer, longest_streak integer)
language sql
security definer
set search_path = public
stable
as $$
  with logged_days as (
    select distinct (created_at at time zone 'utc')::date as log_date
    from public.workouts
    where user_id = auth.uid()
  ),
  islands as (
    select
      log_date,
      log_date - (row_number() over (order by log_date))::integer as island
    from logged_days
  ),
  streaks as (
    select
      max(log_date)     as streak_end,
      count(*)::integer as streak_len
    from islands
    group by island
  )
  select
    coalesce(
      (
        select streak_len
        from streaks
        where streak_end >= (now() at time zone 'utc')::date - 1
        order by streak_end desc
        limit 1
      ), 0
    ) as current_streak,
    coalesce((select max(streak_len) from streaks), 0) as longest_streak;
$$;

revoke all on function public.get_my_workout_streak() from public;
grant execute on function public.get_my_workout_streak() to authenticated;

-- workouts has had zero indexes beyond its primary key since the baseline
-- schema — every per-user query (this one, dashboard's recent-workouts
-- list, progress.tsx's Strength tab, WorkoutLog's loadPreviousSets, and the
-- new PR checks added alongside this feature) has been a full sequential
-- scan. This RPC is the first query to read a user's entire history rather
-- than a capped slice, and it reruns on every dashboard focus, so it's the
-- first thing that will actually feel this.
create index if not exists workouts_user_id_created_at_idx
  on public.workouts (user_id, created_at desc);
