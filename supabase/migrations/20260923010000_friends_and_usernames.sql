-- Usernames + friends (request/accept), a Friends filter on the
-- leaderboards, and a read-only friend profile.
--
-- Depends on 20260923000000_report_and_block.sql (user_blocks,
-- hidden_users) — run that one first.
--
-- All friendship writes go through SECURITY DEFINER functions rather than
-- table policies: sending a request has to check whether the OTHER person
-- blocked you, and user_blocks RLS (rightly) hides other people's blocks
-- from you, so a plain insert policy couldn't see them.

-- =========================================================================
-- Usernames
-- =========================================================================
-- Stored lowercase (the check enforces it) so the plain unique constraint
-- is case-insensitive in practice — "Mike" and "mike" can't both exist.
-- Required by the app (_layout routes to /choose-username until set), but
-- nullable here so existing accounts stay valid until they pick one.
alter table public.profiles
  add column username text unique
  check (username ~ '^[a-z0-9_]{3,20}$');

-- profiles RLS only lets you read your own row, so the username picker
-- can't check availability with a plain select.
create function public.is_username_available(p_username text)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select not exists (
    select 1 from public.profiles
    where username = lower(p_username) and id <> auth.uid()
  );
$$;
revoke all on function public.is_username_available(text) from public;
grant execute on function public.is_username_available(text) to authenticated;

-- =========================================================================
-- Friendships
-- =========================================================================
create table public.friendships (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references auth.users (id) on delete cascade,
  addressee_id uuid not null references auth.users (id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted')),
  created_at timestamptz not null default now(),
  responded_at timestamptz,
  check (requester_id <> addressee_id)
);
-- One row per pair regardless of who asked whom.
create unique index friendships_pair_idx
  on public.friendships (least(requester_id, addressee_id), greatest(requester_id, addressee_id));
create index friendships_addressee_idx on public.friendships (addressee_id);

alter table public.friendships enable row level security;

create policy "Users can see their own friendships"
  on public.friendships for select
  to authenticated
  using ((select auth.uid()) in (requester_id, addressee_id));

-- Read-only from the client; every write goes through the functions below.
grant select on public.friendships to authenticated;

-- Blocking someone ends any friendship or pending request with them.
create function public.end_friendship_on_block()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.friendships
  where (requester_id = new.blocker_id and addressee_id = new.blocked_id)
     or (requester_id = new.blocked_id and addressee_id = new.blocker_id);
  return new;
end;
$$;

create trigger user_blocks_end_friendship
  after insert on public.user_blocks
  for each row execute function public.end_friendship_on_block();

-- Returns the resulting status: 'pending' (request sent) or 'accepted'
-- (they had already asked you, so this accepts theirs).
create function public.send_friend_request(p_user_id uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  me uuid := auth.uid();
  existing public.friendships%rowtype;
begin
  if me is null then raise exception 'not authenticated'; end if;
  if p_user_id = me then raise exception 'cannot friend yourself'; end if;

  -- Same message for blocked and hidden, so it doesn't reveal which.
  if exists (
    select 1 from public.user_blocks
    where (blocker_id = me and blocked_id = p_user_id)
       or (blocker_id = p_user_id and blocked_id = me)
  ) or exists (select 1 from public.hidden_users where user_id = p_user_id) then
    raise exception 'user unavailable';
  end if;

  select * into existing from public.friendships
  where least(requester_id, addressee_id) = least(me, p_user_id)
    and greatest(requester_id, addressee_id) = greatest(me, p_user_id);

  if found then
    if existing.status = 'pending' and existing.addressee_id = me then
      update public.friendships set status = 'accepted', responded_at = now() where id = existing.id;
      return 'accepted';
    end if;
    return existing.status;
  end if;

  insert into public.friendships (requester_id, addressee_id) values (me, p_user_id);
  return 'pending';
end;
$$;
revoke all on function public.send_friend_request(uuid) from public;
grant execute on function public.send_friend_request(uuid) to authenticated;

-- Accept or decline a request sent TO you. Declining deletes the row, so
-- the other person can ask again later and is never told it was declined.
create function public.respond_friend_request(p_user_id uuid, p_accept boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_accept then
    update public.friendships
    set status = 'accepted', responded_at = now()
    where requester_id = p_user_id and addressee_id = auth.uid() and status = 'pending';
  else
    delete from public.friendships
    where requester_id = p_user_id and addressee_id = auth.uid() and status = 'pending';
  end if;
end;
$$;
revoke all on function public.respond_friend_request(uuid, boolean) from public;
grant execute on function public.respond_friend_request(uuid, boolean) to authenticated;

-- Unfriend, or cancel a request you sent.
create function public.remove_friend(p_user_id uuid)
returns void
language sql
security definer
set search_path = public
as $$
  delete from public.friendships
  where (requester_id = auth.uid() and addressee_id = p_user_id)
     or (requester_id = p_user_id and addressee_id = auth.uid());
$$;
revoke all on function public.remove_friend(uuid) from public;
grant execute on function public.remove_friend(uuid) to authenticated;

-- Friends plus pending requests both ways, for the Friends screen and for
-- showing the right button on leaderboard rows.
--   relation: 'friends' | 'incoming' (they asked you) | 'outgoing' (you asked them)
create function public.get_my_friends()
returns table (user_id uuid, username text, full_name text, avatar_path text, relation text, since timestamptz)
language sql
security definer
set search_path = public
stable
as $$
  select
    p.id, p.username, p.full_name, p.avatar_path,
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
revoke all on function public.get_my_friends() from public;
grant execute on function public.get_my_friends() to authenticated;

-- Username search (prefix match, 2+ chars). Skips yourself, hidden users,
-- and anyone blocked in either direction.
create function public.search_users(p_query text)
returns table (user_id uuid, username text, full_name text, avatar_path text)
language sql
security definer
set search_path = public
stable
as $$
  select p.id, p.username, p.full_name, p.avatar_path
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
revoke all on function public.search_users(text) from public;
grant execute on function public.search_users(text) to authenticated;

-- A friend's public stats. Returns no row unless you're accepted friends —
-- never weight, age, goals, meals, notes or photos.
create function public.get_friend_profile(p_user_id uuid)
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
  logged_days as (
    select distinct (created_at at time zone 'utc')::date as log_date
    from public.workouts where user_id = p_user_id
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
      select streak_len from streaks
      where streak_end >= (now() at time zone 'utc')::date - 1
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
revoke all on function public.get_friend_profile(uuid) from public;
grant execute on function public.get_friend_profile(uuid) to authenticated;

-- =========================================================================
-- Leaderboards: add friends_only. Adding a parameter changes the
-- signature, so each is dropped and recreated (grants too). With
-- friends_only, the board is you + your accepted friends and ranks are
-- recomputed within that group. Otherwise identical to
-- 20260923000000_report_and_block.sql.
-- =========================================================================

create function public.is_friend_or_me(p_user_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select p_user_id = auth.uid() or exists (
    select 1 from public.friendships f
    where f.status = 'accepted'
      and least(f.requester_id, f.addressee_id) = least(auth.uid(), p_user_id)
      and greatest(f.requester_id, f.addressee_id) = greatest(auth.uid(), p_user_id)
  );
$$;
revoke all on function public.is_friend_or_me(uuid) from public;

drop function if exists public.get_level_leaderboard(integer);
create function public.get_level_leaderboard(limit_count integer default 50, friends_only boolean default false)
returns table (user_id uuid, full_name text, avatar_path text, total_xp integer, level integer, rnk bigint)
language sql
security definer
set search_path = public
stable
as $$
  select ranked.*
  from (
    select
      p.id as user_id,
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

drop function if exists public.get_strength_leaderboard(integer);
create function public.get_strength_leaderboard(limit_count integer default 50, friends_only boolean default false)
returns table (user_id uuid, full_name text, avatar_path text, log_count bigint, rnk bigint)
language sql
security definer
set search_path = public
stable
as $$
  select ranked.*
  from (
    select
      w.user_id,
      p.full_name,
      p.avatar_path,
      count(*) as log_count,
      rank() over (order by count(*) desc) as rnk
    from public.workouts w
    join public.profiles p on p.id = w.user_id
    where not exists (select 1 from public.hidden_users h where h.user_id = w.user_id)
      and (not friends_only or public.is_friend_or_me(w.user_id))
    group by w.user_id, p.full_name, p.avatar_path
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

drop function if exists public.get_cardio_leaderboard(integer);
create function public.get_cardio_leaderboard(limit_count integer default 50, friends_only boolean default false)
returns table (user_id uuid, full_name text, avatar_path text, log_count bigint, rnk bigint)
language sql
security definer
set search_path = public
stable
as $$
  select ranked.*
  from (
    select
      c.user_id,
      p.full_name,
      p.avatar_path,
      count(*) as log_count,
      rank() over (order by count(*) desc) as rnk
    from public.cardio_logs c
    join public.profiles p on p.id = c.user_id
    where not exists (select 1 from public.hidden_users h where h.user_id = c.user_id)
      and (not friends_only or public.is_friend_or_me(c.user_id))
    group by c.user_id, p.full_name, p.avatar_path
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

drop function if exists public.get_streak_leaderboard(integer);
create function public.get_streak_leaderboard(limit_count integer default 50, friends_only boolean default false)
returns table (user_id uuid, full_name text, avatar_path text, current_streak integer, rnk bigint)
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
      p.full_name,
      p.avatar_path,
      coalesce(cs.current_streak, 0) as current_streak,
      rank() over (order by coalesce(cs.current_streak, 0) desc) as rnk
    from public.profiles p
    left join current_streaks cs on cs.user_id = p.id
    where not exists (select 1 from public.hidden_users h where h.user_id = p.id)
      and (not friends_only or public.is_friend_or_me(p.id))
  )
  select ranked.*
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
