-- Lets an authenticated user permanently delete their own account in-app
-- (Settings > Danger zone > Delete Account), replacing the previous
-- email-support-and-wait-48-hours flow. Required for App Store review
-- (Guideline 5.1.1(v): apps that support account creation must also offer
-- in-app account deletion, not just a request-by-email path).
--
-- Deleting the auth.users row cascades to every table that FKs it with
-- `on delete cascade` — profiles, workouts, calorie_logs, cardio_logs,
-- water_logs, weight_logs, custom_meals (see baseline_schema.sql and
-- 20260810000000_custom_meals.sql) — so no per-table cleanup is needed
-- here. Workout photos in Storage are NOT covered by this cascade (Storage
-- objects aren't linked to auth.users by a `references` FK), so the app
-- deletes those explicitly before calling this function — see
-- deleteAllWorkoutPhotos in src/utils/workoutPhotos.ts.
--
-- A plain client can't delete from auth.users directly (no table
-- privileges are ever granted there), so this is a SECURITY DEFINER
-- function: it runs with the privilege of whoever owns it (the
-- postgres/supabase_admin role, which does have access to auth.users), but
-- the `where id = auth.uid()` clause means a caller can only ever delete
-- their own row — there is no user_id parameter for them to pass anyone
-- else's id.
create or replace function public.delete_user()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from auth.users where id = auth.uid();
end;
$$;

revoke all on function public.delete_user() from public;
grant execute on function public.delete_user() to authenticated;
