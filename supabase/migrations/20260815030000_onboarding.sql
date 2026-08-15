-- Gates the new first-run onboarding flow (src/app/onboarding.tsx). Null
-- means "hasn't completed (or skipped) onboarding yet" — src/app/_layout.tsx
-- redirects to /onboarding whenever a logged-in user's profile has this
-- null.
--
-- Without the backfill below, every EXISTING account would also read as
-- null the moment this column is added, and get redirected into onboarding
-- on their next login — clearly wrong for accounts that predate onboarding
-- existing at all. So this stamps every current profile's
-- onboarding_completed_at with its own created_at, meaning only signups
-- from this point forward see the flow.
--
-- Idempotent (safe to paste more than once) — see
-- 20260815010000_achievements.sql for why that matters in this project.
alter table public.profiles
  add column if not exists onboarding_completed_at timestamptz;

update public.profiles
  set onboarding_completed_at = created_at
  where onboarding_completed_at is null;
