-- Public surfaces show @username; real names only reach accepted friends.
--
-- Before: every leaderboard row, username search result, pending friend
-- request and blocked-user entry carried the person's full_name (sign-up asks
-- for "Full Name"), visible to anyone. Searching usernames two letters at a
-- time could collect the real names of every user.
--
-- After: these functions also return username, and return full_name only
-- when the viewer is that person or an accepted friend (is_friend_or_me()).
-- Bodies are otherwise identical to 20260923010000_friends_and_usernames.sql
-- and 20260923000000_report_and_block.sql. get_friend_profile already
-- requires friendship and is unchanged.
--
-- Safe in either order with the app update: the app shows full_name when it
-- gets one and falls back to @username.

-- =========================================================================
-- Leaderboards (adding a column changes the signature: drop + recreate,
-- grants included)
-- =========================================================================
drop function if exists public.get_level_leaderboard(integer, boolean);
create function public.get_level_leaderboard(limit_count integer default 50, friends_only boolean default false)
returns table (user_id uuid, username text, full_name text, avatar_path text, total_xp integer, level integer, rnk bigint)
language sql
security definer
set search_path = public
stable
as $$
  select ranked.user_id, ranked.username,
         case when public.is_friend_or_me(ranked.user_id) then ranked.full_name end,
         ranked.avatar_path, ranked.total_xp, ranked.level, ranked.rnk
  from (
    select
      p.id as user_id,
      p.username,
      p.full_name,
      p.avatar_path,
      coalesce(p.total_xp, 0) as total_xp,
      floor(sqrt(greatest(coalesce(p.total_xp, 0), 0) / 100.0))::integer as level,
      rank() over (order by coalesce(p.total_xp, 0) desc) as rnk
    from public.profiles p
    where not exists (select 1 from public.hidden_users h where h.user_id = p.id)
      and (not friends_only or public.is_friend_or_me(p.id))
  ) ranked
  where not exists (
    select 1 from public.user_blocks b
    where (b.blocker_id = auth.uid() and b.blocked_id = ranked.user_id)
       or (b.blocker_id = ranked.user_id and b.blocked_id = auth.uid())
  )
  order by ranked.total_xp desc
  limit least(coalesce(limit_count, 50), 200);
$$;
revoke all on function public.get_level_leaderboard(integer, boolean) from public;
grant execute on function public.get_level_leaderboard(integer, boolean) to authenticated;

drop function if exists public.get_strength_leaderboard(integer, boolean);
create function public.get_strength_leaderboard(limit_count integer default 50, friends_only boolean default false)
returns table (user_id uuid, username text, full_name text, avatar_path text, log_count bigint, rnk bigint)
language sql
security definer
set search_path = public
stable
as $$
  select ranked.user_id, ranked.username,
         case when public.is_friend_or_me(ranked.user_id) then ranked.full_name end,
         ranked.avatar_path, ranked.log_count, ranked.rnk
  from (
    select
      w.user_id,
      p.username,
      p.full_name,
      p.avatar_path,
      count(*) as log_count,
      rank() over (order by count(*) desc) as rnk
    from public.workouts w
    join public.profiles p on p.id = w.user_id
    where not exists (select 1 from public.hidden_users h where h.user_id = w.user_id)
      and (not friends_only or public.is_friend_or_me(w.user_id))
    group by w.user_id, p.username, p.full_name, p.avatar_path
  ) ranked
  where not exists (
    select 1 from public.user_blocks b
    where (b.blocker_id = auth.uid() and b.blocked_id = ranked.user_id)
       or (b.blocker_id = ranked.user_id and b.blocked_id = auth.uid())
  )
  order by ranked.log_count desc
  limit least(coalesce(limit_count, 50), 200);
$$;
revoke all on function public.get_strength_leaderboard(integer, boolean) from public;
grant execute on function public.get_strength_leaderboard(integer, boolean) to authenticated;

drop function if exists public.get_cardio_leaderboard(integer, boolean);
create function public.get_cardio_leaderboard(limit_count integer default 50, friends_only boolean default false)
returns table (user_id uuid, username text, full_name text, avatar_path text, log_count bigint, rnk bigint)
language sql
security definer
set search_path = public
stable
as $$
  select ranked.user_id, ranked.username,
         case when public.is_friend_or_me(ranked.user_id) then ranked.full_name end,
         ranked.avatar_path, ranked.log_count, ranked.rnk
  from (
    select
      c.user_id,
      p.username,
      p.full_name,
      p.avatar_path,
      count(*) as log_count,
      rank() over (order by count(*) desc) as rnk
    from public.cardio_logs c
    join public.profiles p on p.id = c.user_id
    where not exists (select 1 from public.hidden_users h where h.user_id = c.user_id)
      and (not friends_only or public.is_friend_or_me(c.user_id))
    group by c.user_id, p.username, p.full_name, p.avatar_path
  ) ranked
  where not exists (
    select 1 from public.user_blocks b
    where (b.blocker_id = auth.uid() and b.blocked_id = ranked.user_id)
       or (b.blocker_id = ranked.user_id and b.blocked_id = auth.uid())
  )
  order by ranked.log_count desc
  limit least(coalesce(limit_count, 50), 200);
$$;
revoke all on function public.get_cardio_leaderboard(integer, boolean) from public;
grant execute on function public.get_cardio_leaderboard(integer, boolean) to authenticated;

drop function if exists public.get_streak_leaderboard(integer, boolean);
create function public.get_streak_leaderboard(limit_count integer default 50, friends_only boolean default false)
returns table (user_id uuid, username text, full_name text, avatar_path text, current_streak integer, rnk bigint)
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
revoke all on function public.get_streak_leaderboard(integer, boolean) from public;
grant execute on function public.get_streak_leaderboard(integer, boolean) to authenticated;

-- =========================================================================
-- Username search: real name only for people you're already friends with.
-- Same signature, so CREATE OR REPLACE keeps the existing grants.
-- =========================================================================
create or replace function public.search_users(p_query text)
returns table (user_id uuid, username text, full_name text, avatar_path text)
language sql
security definer
set search_path = public
stable
as $$
  select p.id, p.username,
         case when public.is_friend_or_me(p.id) then p.full_name end,
         p.avatar_path
  from public.profiles p
  where char_length(trim(p_query)) >= 2
    and p.username like replace(replace(lower(trim(both '@ ' from p_query)), '_', '\_'), '%', '\%') || '%'
    and p.id <> auth.uid()
    and not exists (select 1 from public.hidden_users h where h.user_id = p.id)
    and not exists (
      select 1 from public.user_blocks b
      where (b.blocker_id = auth.uid() and b.blocked_id = p.id)
         or (b.blocker_id = p.id and b.blocked_id = auth.uid())
    )
  order by p.username
  limit 20;
$$;

-- =========================================================================
-- Friends list: pending requests (either direction) show only the username
-- until accepted. Same signature.
-- =========================================================================
create or replace function public.get_my_friends()
returns table (user_id uuid, username text, full_name text, avatar_path text, relation text, since timestamptz)
language sql
security definer
set search_path = public
stable
as $$
  select
    p.id, p.username,
    case when f.status = 'accepted' then p.full_name end,
    p.avatar_path,
    case
      when f.status = 'accepted' then 'friends'
      when f.addressee_id = auth.uid() then 'incoming'
      else 'outgoing'
    end,
    coalesce(f.responded_at, f.created_at)
  from public.friendships f
  join public.profiles p
    on p.id = case when f.requester_id = auth.uid() then f.addressee_id else f.requester_id end
  where auth.uid() in (f.requester_id, f.addressee_id)
  order by coalesce(f.responded_at, f.created_at) desc;
$$;

-- =========================================================================
-- Blocked users list: add username (signature change: drop + recreate).
-- Blocking ends any friendship, so full_name is effectively always null.
-- =========================================================================
drop function if exists public.get_my_blocked_users();
create function public.get_my_blocked_users()
returns table (user_id uuid, username text, full_name text, avatar_path text, blocked_at timestamptz)
language sql
security definer
set search_path = public
stable
as $$
  select b.blocked_id, p.username,
         case when public.is_friend_or_me(b.blocked_id) then p.full_name end,
         p.avatar_path, b.created_at
  from public.user_blocks b
  left join public.profiles p on p.id = b.blocked_id
  where b.blocker_id = auth.uid()
  order by b.created_at desc;
$$;
revoke all on function public.get_my_blocked_users() from public;
grant execute on function public.get_my_blocked_users() to authenticated;
