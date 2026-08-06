-- awardXP() previously read profiles.total_xp into JS, added the award, then
-- wrote the sum back (see src/lib/xp.ts). Two near-simultaneous awards (e.g.
-- logging water and a meal back to back, since the tabs layout keeps all log
-- modals mounted at once) could both read the same starting value and one
-- write would silently clobber the other, losing XP.
--
-- This makes the increment atomic at the database layer. auth.uid() is used
-- instead of a passed-in user id so the function can only ever touch the
-- caller's own row, regardless of what the client sends.
create or replace function public.increment_xp(p_xp integer)
returns integer
language plpgsql
security invoker
set search_path = public
as $$
declare
  new_xp integer;
begin
  update public.profiles
  set total_xp = coalesce(total_xp, 0) + p_xp
  where id = auth.uid()
  returning total_xp into new_xp;

  return new_xp;
end;
$$;

grant execute on function public.increment_xp(integer) to authenticated;
