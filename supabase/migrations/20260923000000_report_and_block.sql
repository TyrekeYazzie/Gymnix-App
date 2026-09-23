-- Report + block for user-generated content (App Store Guideline 1.2).
-- Display names and public profile photos on the leaderboards count as UGC,
-- so Apple requires: a way to report a user, a way to block them, and a way
-- for the developer to act on reports (see "Moderating" at the bottom).
--
--   user_blocks   — who each user has blocked. Blocks hide in BOTH
--                   directions on the leaderboards.
--   user_reports  — write-only for users; only the developer (dashboard /
--                   service role) can read them.
--   hidden_users  — developer-controlled list of accounts removed from the
--                   leaderboards. No client grants at all, so a user can't
--                   un-hide themselves (a flag on profiles couldn't give that
--                   guarantee, since users can update their own profile row).
--
-- Both user tables FK auth.users with on delete cascade, so delete_user()
-- cleans them up with no changes there — except a report's reporter, which
-- is set null so the report survives the reporter deleting their account.

-- =========================================================================
-- Blocks
-- =========================================================================
create table public.user_blocks (
  blocker_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  blocked_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);
-- The primary key covers lookups by blocker; this one covers "who blocked me".
create index user_blocks_blocked_id_idx on public.user_blocks (blocked_id);

alter table public.user_blocks enable row level security;

create policy "Users can see their own blocks"
  on public.user_blocks for select
  to authenticated
  using (blocker_id = (select auth.uid()));

create policy "Users can block others"
  on public.user_blocks for insert
  to authenticated
  with check (blocker_id = (select auth.uid()));

create policy "Users can unblock"
  on public.user_blocks for delete
  to authenticated
  using (blocker_id = (select auth.uid()));

grant select, insert, delete on public.user_blocks to authenticated;

-- =========================================================================
-- Reports
-- =========================================================================
create table public.user_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid default auth.uid() references auth.users (id) on delete set null,
  reported_id uuid not null references auth.users (id) on delete cascade,
  reason text not null check (reason in ('offensive_name', 'inappropriate_photo', 'impersonation', 'other')),
  details text check (char_length(details) <= 500),
  -- Snapshot of what the reporter saw, since the user can change their name
  -- or photo before the report is reviewed.
  reported_name text,
  reported_avatar_path text,
  status text not null default 'open' check (status in ('open', 'actioned', 'dismissed')),
  created_at timestamptz not null default now()
);
create index user_reports_open_idx on public.user_reports (created_at) where status = 'open';

alter table public.user_reports enable row level security;

create policy "Users can file reports"
  on public.user_reports for insert
  to authenticated
  with check (
    reporter_id = (select auth.uid())
    and reported_id <> (select auth.uid())
    and status = 'open'
  );

-- Insert only — no select/update/delete policy or grant, so reports can't be
-- read back or edited from the app.
grant insert on public.user_reports to authenticated;

-- =========================================================================
-- Hidden users (developer-only)
-- =========================================================================
create table public.hidden_users (
  user_id uuid primary key references auth.users (id) on delete cascade,
  reason text,
  created_at timestamptz not null default now()
);
alter table public.hidden_users enable row level security;
-- Intentionally no policies and no grants to anon/authenticated.

-- =========================================================================
-- Blocked-users list for Settings (names aren't readable via profiles RLS)
-- =========================================================================
create function public.get_my_blocked_users()
returns table (user_id uuid, full_name text, avatar_path text, blocked_at timestamptz)
language sql
security definer
set search_path = public
stable
as $$
  select b.blocked_id, p.full_name, p.avatar_path, b.created_at
  from public.user_blocks b
  left join public.profiles p on p.id = b.blocked_id
  where b.blocker_id = auth.uid()
  order by b.created_at desc;
$$;
revoke all on function public.get_my_blocked_users() from public;
grant execute on function public.get_my_blocked_users() to authenticated;

-- =========================================================================
-- Leaderboards: exclude hidden users from ranking, and drop rows where
-- either side has blocked the other. Ranks are computed before the block
-- filter, so a blocked user leaves a gap (#1, #2, #4) rather than shifting
-- everyone's rank on one viewer's screen only. Signatures are unchanged, so
-- CREATE OR REPLACE works; bodies are otherwise identical to
-- 20260922010000_profile_avatars.sql.
--
-- The get_my_*_rank functions are left alone: a hidden user ranked above
-- you can make "your rank" read one higher than the list implies. Rare
-- enough (only after moderation) not to be worth redefining four more
-- functions.
-- =========================================================================

create or replace function public.get_level_leaderboard(limit_count integer default 50)
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
  ) ranked
  where not exists (
    select 1 from public.user_blocks b
    where (b.blocker_id = auth.uid() and b.blocked_id = ranked.user_id)
       or (b.blocker_id = ranked.user_id and b.blocked_id = auth.uid())
  )
  order by ranked.total_xp desc
  limit least(coalesce(limit_count, 50), 200);
$$;

create or replace function public.get_strength_leaderboard(limit_count integer default 50)
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

create or replace function public.get_cardio_leaderboard(limit_count integer default 50)
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

create or replace function public.get_streak_leaderboard(limit_count integer default 50)
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

-- =========================================================================
-- Moderating (run by hand in the SQL editor — Apple expects action on
-- reports within 24 hours):
--
--   -- open reports, newest first
--   select * from user_reports where status = 'open' order by created_at desc;
--
--   -- remove an offensive name/photo (the app deletes the old avatar file
--   -- on the next upload; delete it in Storage > avatars too if needed)
--   update profiles set full_name = null, avatar_path = null where id = '<user id>';
--
--   -- take someone off the leaderboards entirely
--   insert into hidden_users (user_id, reason) values ('<user id>', 'repeat offender');
--
--   -- close the report
--   update user_reports set status = 'actioned' where id = '<report id>';
-- =========================================================================
