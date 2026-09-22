-- Profile pictures, shown on the Profile screen and next to names on the
-- leaderboards.
--
-- Images are cropped square and re-encoded on the device before upload
-- (400x400 JPEG, see src/utils/avatar.ts), the way Instagram/YouTube
-- normalize profile photos — so the bucket only ever needs to hold small
-- JPEGs, and enforces that server-side too: 512 KB cap, image/jpeg only.
-- Re-encoding also strips EXIF metadata (GPS location, device info) before
-- the file ever leaves the phone.
--
-- Unlike workout-photos, this bucket is PUBLIC: a profile picture is meant
-- to be seen by other users on the leaderboard, and public URLs can be
-- cached by the CDN/device instead of re-signing 50 URLs per leaderboard
-- load. Writes are still locked to the owner's own "{user_id}/" folder.
--
-- Each upload gets a fresh filename ("{user_id}/{timestamp}.jpg") so a
-- changed picture is never served from a stale cache; the old file is
-- deleted by the app right after the new one is saved.

alter table public.profiles
  add column avatar_path text;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 524288, array['image/jpeg'])
on conflict (id) do nothing;

create policy "Users can upload their own avatar"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Public buckets serve files by URL without a select policy; this one only
-- exists so the app can list() its own folder to clean up old files.
create policy "Users can list their own avatars"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Users can replace their own avatar"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Users can delete their own avatar"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- =========================================================================
-- Leaderboards: add avatar_path to each top-N function's output.
-- A RETURNS TABLE signature can't be changed with CREATE OR REPLACE, so each
-- one is dropped and recreated — bodies are otherwise identical to
-- 20260805000000_leaderboards.sql / 20260815000000_streak_leaderboard.sql.
-- avatar_path is only a storage path to an already-public image, so it
-- doesn't widen what these SECURITY DEFINER functions expose in any
-- meaningful way.
-- =========================================================================

drop function if exists public.get_level_leaderboard(integer);
create function public.get_level_leaderboard(limit_count integer default 50)
returns table (user_id uuid, full_name text, avatar_path text, total_xp integer, level integer, rnk bigint)
language sql
security definer
set search_path = public
stable
as $$
  select
    p.id as user_id,
    p.full_name,
    p.avatar_path,
    coalesce(p.total_xp, 0) as total_xp,
    floor(sqrt(greatest(coalesce(p.total_xp, 0), 0) / 100.0))::integer as level,
    rank() over (order by coalesce(p.total_xp, 0) desc) as rnk
  from public.profiles p
  order by total_xp desc
  limit least(coalesce(limit_count, 50), 200);
$$;
revoke all on function public.get_level_leaderboard(integer) from public;
grant execute on function public.get_level_leaderboard(integer) to authenticated;

drop function if exists public.get_strength_leaderboard(integer);
create function public.get_strength_leaderboard(limit_count integer default 50)
returns table (user_id uuid, full_name text, avatar_path text, log_count bigint, rnk bigint)
language sql
security definer
set search_path = public
stable
as $$
  select
    w.user_id,
    p.full_name,
    p.avatar_path,
    count(*) as log_count,
    rank() over (order by count(*) desc) as rnk
  from public.workouts w
  join public.profiles p on p.id = w.user_id
  group by w.user_id, p.full_name, p.avatar_path
  order by log_count desc
  limit least(coalesce(limit_count, 50), 200);
$$;
revoke all on function public.get_strength_leaderboard(integer) from public;
grant execute on function public.get_strength_leaderboard(integer) to authenticated;

drop function if exists public.get_cardio_leaderboard(integer);
create function public.get_cardio_leaderboard(limit_count integer default 50)
returns table (user_id uuid, full_name text, avatar_path text, log_count bigint, rnk bigint)
language sql
security definer
set search_path = public
stable
as $$
  select
    c.user_id,
    p.full_name,
    p.avatar_path,
    count(*) as log_count,
    rank() over (order by count(*) desc) as rnk
  from public.cardio_logs c
  join public.profiles p on p.id = c.user_id
  group by c.user_id, p.full_name, p.avatar_path
  order by log_count desc
  limit least(coalesce(limit_count, 50), 200);
$$;
revoke all on function public.get_cardio_leaderboard(integer) from public;
grant execute on function public.get_cardio_leaderboard(integer) to authenticated;

drop function if exists public.get_streak_leaderboard(integer);
create function public.get_streak_leaderboard(limit_count integer default 50)
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
  )
  select
    p.id as user_id,
    p.full_name,
    p.avatar_path,
    coalesce(cs.current_streak, 0) as current_streak,
    rank() over (order by coalesce(cs.current_streak, 0) desc) as rnk
  from public.profiles p
  left join current_streaks cs on cs.user_id = p.id
  order by current_streak desc
  limit least(coalesce(limit_count, 50), 200);
$$;
revoke all on function public.get_streak_leaderboard(integer) from public;
grant execute on function public.get_streak_leaderboard(integer) to authenticated;
