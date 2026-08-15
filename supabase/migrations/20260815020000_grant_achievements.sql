-- Defensive grant for the two achievements tables — see
-- 20260810010000_grant_log_tables.sql for why this project needs these
-- explicit (its default privileges don't reliably extend to new tables).
-- Missing this grant is exactly what produced "permission denied for table
-- achievements" from getMyAchievements()'s direct .from('achievements')
-- read, even with the RLS select policy from 20260815010000_achievements.sql
-- already in place — a GRANT is a separate, prerequisite layer to RLS, not
-- implied by it.
--
-- Both are select-only for authenticated: user_achievements intentionally
-- has no insert/update/delete policy at all (only the SECURITY DEFINER
-- check_and_unlock_achievements() function writes to it), so there's
-- nothing to grant beyond select there either. Safe to run more than once.
grant select on public.achievements      to authenticated;
grant select on public.user_achievements to authenticated;
