-- Server-side login lockout via Supabase Auth's "Password Verification
-- Attempt" hook. This closes the gap in src/utils/rateLimiter.ts: that
-- lockout only runs on-device (SecureStore/AsyncStorage), so anyone calling
-- POST /auth/v1/token?grant_type=password directly (curl, Postman) bypasses
-- it entirely. GoTrue invokes this hook itself on every password
-- verification attempt, correct or not, for every client -- there is no
-- request path that skips it, so this is the real control. The client-side
-- rateLimiter.ts stays as-is on top of this for instant UI feedback without
-- a round trip, but it is no longer the thing actually enforcing the lock.
--
-- Same exponential-backoff tiers as rateLimiter.ts, so the lockout a user
-- sees in the app matches what the server actually enforces:
--   5 attempts -> 1 min, 6 -> 2 min, 7 -> 4 min, 8+ -> 30 min.
--
-- STATUS (2026-08-14): NOT ACTIVE. Wiring a Postgres-function hook to an
-- auth event happens in Supabase Dashboard > Authentication > Hooks >
-- Password Verification Attempt > Postgres Function, but that page is
-- gated behind the Team/Enterprise plan -- confirmed by hitting a "Team or
-- Enterprise Plan required" wall trying to enable it on this project's
-- current plan. Decision: leave the client-side lockout in
-- src/utils/rateLimiter.ts as the only protection for now (accepted risk --
-- see KNOWN_ISSUES.md) rather than block on a plan upgrade or build a
-- CAPTCHA-based alternative. This table/function are left in place, inert,
-- so upgrading the plan later is a pure dashboard toggle with zero new code.
--
-- If the plan is ever upgraded, wiring instructions are: Supabase Dashboard
-- > Authentication > Hooks > Password Verification Attempt > Postgres
-- Function > public.hook_password_verification_attempt. (If this project
-- later adopts the Supabase CLI/config.toml workflow instead of
-- dashboard-applied migrations, the equivalent is:
--   [auth.hook.password_verification_attempt]
--   enabled = true
--   uri = "pg-functions://postgres/public/hook_password_verification_attempt"
-- )

create table if not exists public.password_failed_verification_attempts (
  user_id uuid primary key references auth.users(id) on delete cascade,
  attempts integer not null default 0,
  last_attempt timestamptz not null default now(),
  locked_until timestamptz
);

-- Only supabase_auth_admin (the role GoTrue connects as to run hooks) and
-- the Postgres owner ever touch this table -- no application role gets
-- access, so there is no client code path, RLS policy, or RPC that can
-- read or clear another user's lockout state.
alter table public.password_failed_verification_attempts enable row level security;
revoke all on table public.password_failed_verification_attempts from authenticated, anon, public;
grant all on table public.password_failed_verification_attempts to supabase_auth_admin;
grant usage on schema public to supabase_auth_admin;

create or replace function public.hook_password_verification_attempt(event jsonb)
returns jsonb
language plpgsql
set search_path = ''
as $$
declare
  target_user_id uuid := (event->>'user_id')::uuid;
  attempt_was_valid boolean := (event->>'valid')::boolean;
  existing record;
  new_attempts integer;
  lock_seconds integer;
begin
  select attempts, locked_until into existing
  from public.password_failed_verification_attempts
  where user_id = target_user_id;

  -- Still locked out: reject regardless of whether this attempt's password
  -- was correct. Letting a correct-password attempt through mid-lockout
  -- would defeat the point of locking in the first place (e.g. an attacker
  -- who eventually guesses right, or a credential-stuffing hit).
  if existing.locked_until is not null and existing.locked_until > now() then
    return jsonb_build_object(
      'error', jsonb_build_object(
        'http_code', 429,
        'message', 'Too many failed attempts. Please try again later.'
      )
    );
  end if;

  if attempt_was_valid then
    -- Successful login (and not currently locked) clears the counter.
    delete from public.password_failed_verification_attempts where user_id = target_user_id;
    return jsonb_build_object('decision', 'continue');
  end if;

  new_attempts := coalesce(existing.attempts, 0) + 1;

  -- Highest threshold checked first for the same reason as the client-side
  -- version: attempts only ever grows, so an ascending chain would always
  -- match the lowest tier first.
  lock_seconds := case
    when new_attempts >= 8 then 1800
    when new_attempts >= 7 then 240
    when new_attempts >= 6 then 120
    when new_attempts >= 5 then 60
    else 0
  end;

  insert into public.password_failed_verification_attempts (user_id, attempts, last_attempt, locked_until)
  values (
    target_user_id,
    new_attempts,
    now(),
    case when lock_seconds > 0 then now() + make_interval(secs => lock_seconds) else null end
  )
  on conflict (user_id) do update
    set attempts = excluded.attempts,
        last_attempt = excluded.last_attempt,
        locked_until = excluded.locked_until;

  return jsonb_build_object('decision', 'continue');
end;
$$;

revoke all on function public.hook_password_verification_attempt(jsonb) from public, authenticated, anon;
grant execute on function public.hook_password_verification_attempt(jsonb) to supabase_auth_admin;
