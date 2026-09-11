-- Night mode + daily quotes visibility, both user-controlled from Settings >
-- Preferences. Same pattern as reminders_enabled: a plain boolean on
-- profiles, covered by the existing "Users can manage their own data" RLS
-- policy (for all using auth.uid() = id) — no new policy or grant needed
-- since this is an existing table, not a new one.

alter table public.profiles
  add column dark_mode_enabled boolean not null default false,
  add column daily_quotes_enabled boolean not null default true;
