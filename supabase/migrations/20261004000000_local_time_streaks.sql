-- Workout streaks count days in each user's own time zone, not UTC.
--
-- Before: every streak function bucketed workouts by UTC date. In the US a
-- 6pm workout is already "tomorrow" in UTC, so a streak could skip a day or
-- double-count one, and "today" flipped over in the afternoon or evening.
--
-- After: profiles.time_zone holds the device's IANA zone (e.g.
-- 'America/Phoenix'), written by the app on launch. Streak days and "today"
-- use it; users who haven't opened the updated app yet stay on UTC, exactly
-- as before. Function bodies are otherwise unchanged from
-- 20260814010000_workout_streak.sql, 20260815000000_streak_leaderboard.sql,
-- 20260923010000_friends_and_usernames.sql (get_friend_profile) and
-- 20261003010000_usernames_on_public_boards.sql (get_streak_leaderboard).
-- Same signatures, so CREATE OR REPLACE keeps the existing grants.
-- Achievements read get_my_workout_streak(), so they follow automatically.
--
-- Run 20261003010000_usernames_on_public_boards.sql first.

-- -------------------------------------------------------------------------
-- 1. The column. The check rejects names Postgres doesn't know (the cast
--    raises "time zone not recognized"), so the functions below never fail.
-- -------------------------------------------------------------------------
alter table public.profiles add column if not exists time_zone text;

alter table public.profiles drop constraint if exists profiles_time_zone_valid;
alter table public.profiles add constraint profiles_time_zone_valid check (
  time_zone is null
  or (char_length(time_zone) <= 64
      and (timestamptz '2000-01-01 00:00+00' at time zone time_zone) is not null)
);

-- Clients write profiles through column-level grants
-- (20261003000000_server_side_xp.sql); add the new column to them.
grant insert (time_zone), update (time_zone) on public.profiles to authenticated;

-- -------------------------------------------------------------------------
-- 2. Your own streak (Dashboard, Insights, streak achievements).
-- -------------------------------------------------------------------------
create or replace function public.get_my_workout_streak()
returns table (current_streak integer, longest_streak integer)
language sql
security definer
set search_path = public
stable
as $$
  with tz as (
    select coalesce((select time_zone from public.profiles where id = auth.uid()), 'UTC') as name
  ),
  logged_days as (
    select distinct (w.created_at at time zone tz.name)::date as log_date
    from public.workouts w, tz
    where w.user_id = auth.uid()
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
        from streaks, tz
        where streak_end >= (now() at time zone tz.name)::date - 1
        order by streak_end desc
        limit 1
      ), 0
    ) as current_streak,
    coalesce((select max(streak_len) from streaks), 0) as longest_streak;
$$;

-- -------------------------------------------------------------------------
-- 3. Your rank on the streak board.
-- -------------------------------------------------------------------------
create or replace function public.get_my_streak_rank()
returns table (rnk bigint, current_streak integer)
language sql
security definer
set search_path = public
stable
as $$
  with logged_days as (
    select distinct w.user_id, (w.created_at at time zone coalesce(p.time_zone, 'UTC'))::date as log_date
    from public.workouts w
    join public.profiles p on p.id = w.user_id
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
    select distinct on (s.user_id) s.user_id, s.streak_len as current_streak
    from streaks s
    join public.profiles p on p.id = s.user_id
    where s.streak_end >= (now() at time zone coalesce(p.time_zone, 'UTC'))::date - 1
    order by s.user_id, s.streak_end desc
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

-- -------------------------------------------------------------------------
-- 4. The streak leaderboard: each person's streak in their own zone.
-- -------------------------------------------------------------------------
create or replace function public.get_streak_leaderboard(limit_count integer default 50, friends_only boolean default false)
returns table (user_id uuid, username text, full_name text, avatar_path text, current_streak integer, rnk bigint)
language sql
security definer
set search_path = public
stable
as $$
  with logged_days as (
    select distinct w.user_id, (w.created_at at time zone coalesce(p.time_zone, 'UTC'))::date as log_date
    from public.workouts w
    join public.profiles p on p.id = w.user_id
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
    select distinct on (s.user_id) s.user_id, s.streak_len as current_streak
    from streaks s
    join public.profiles p on p.id = s.user_id
    where s.streak_end >= (now() at time zone coalesce(p.time_zone, 'UTC'))::date - 1
    order by s.user_id, s.streak_end desc
  ),
  ranked as (
    select
      p.id as user_id,
      p.username,
      p.full_name,
      p.avatar_path,
      coalesce(cs.current_streak, 0) as current_streak,
      rank() over (order by coalesce(cs.current_streak, 0) desc) as rnk
    from public.profiles p
    left join current_streaks cs on cs.user_id = p.id
    where not exists (select 1 from public.hidden_users h where h.user_id = p.id)
      and (not friends_only or public.is_friend_or_me(p.id))
  )
  select ranked.user_id, ranked.username,
         case when public.is_friend_or_me(ranked.user_id) then ranked.full_name end,
         ranked.avatar_path, ranked.current_streak, ranked.rnk
  from ranked
  where not exists (
    select 1 from public.user_blocks b
    where (b.blocker_id = auth.uid() and b.blocked_id = ranked.user_id)
       or (b.blocker_id = ranked.user_id and b.blocked_id = auth.uid())
  )
  order by ranked.current_streak desc
  limit least(coalesce(limit_count, 50), 200);
$$;

-- -------------------------------------------------------------------------
-- 5. A friend's profile: their streak, in their zone.
-- -------------------------------------------------------------------------
create or replace function public.get_friend_profile(p_user_id uuid)
returns table (
  user_id uuid, username text, full_name text, avatar_path text,
  total_xp integer, level integer, current_streak integer,
  workout_count bigint, cardio_count bigint, achievement_keys text[], friends_since timestamptz
)
language sql
security definer
set search_path = public
stable
as $$
  with friendship as (
    select coalesce(f.responded_at, f.created_at) as since
    from public.friendships f
    where f.status = 'accepted'
      and least(f.requester_id, f.addressee_id) = least(auth.uid(), p_user_id)
      and greatest(f.requester_id, f.addressee_id) = greatest(auth.uid(), p_user_id)
  ),
  tz as (
    select coalesce((select time_zone from public.profiles where id = p_user_id), 'UTC') as name
  ),
  logged_days as (
    select distinct (w.created_at at time zone tz.name)::date as log_date
    from public.workouts w, tz
    where w.user_id = p_user_id
  ),
  islands as (
    select log_date, log_date - (row_number() over (order by log_date))::integer as island
    from logged_days
  ),
  streaks as (
    select max(log_date) as streak_end, count(*)::integer as streak_len
    from islands group by island
  )
  select
    p.id, p.username, p.full_name, p.avatar_path,
    coalesce(p.total_xp, 0),
    floor(sqrt(greatest(coalesce(p.total_xp, 0), 0) / 100.0))::integer,
    coalesce((
      select streak_len from streaks, tz
      where streak_end >= (now() at time zone tz.name)::date - 1
      order by streak_end desc limit 1
    ), 0),
    (select count(*) from public.workouts w where w.user_id = p.id),
    (select count(*) from public.cardio_logs c where c.user_id = p.id),
    coalesce((
      select array_agg(ua.achievement_key order by ua.unlocked_at)
      from public.user_achievements ua where ua.user_id = p.id
    ), '{}'),
    (select since from friendship)
  from public.profiles p
  where p.id = p_user_id and exists (select 1 from friendship);
$$;
