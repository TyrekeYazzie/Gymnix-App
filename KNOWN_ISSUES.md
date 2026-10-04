# Known Issues

## No per-account login lockout; per-IP limits only (accepted risk, updated 2026-10-03)

`src/utils/rateLimiter.ts` locks an account out on this device after
repeated failed logins. It's UI feedback only: anyone calling Supabase's
password sign-in endpoint directly (curl, a script) skips it.

What does apply server-side, per Supabase's
[documented Auth rate limits](https://supabase.com/docs/guides/auth/rate-limits)
(checked 2026-10-03; adjustable in Dashboard > Authentication > Rate Limits):
- sign-ins and sign-ups: 30 requests per 5 minutes per IP address
- the token endpoint (password logins, refreshes): 150 requests per 5 minutes per IP

So one machine can't brute-force a password quickly. What's missing is a
per-*account* lockout, which would also stop an attacker spreading guesses
across many IPs. That's the Auth Hook in
`supabase/migrations/20260814000000_password_verification_rate_limit.sql`,
written but **not active**: Auth Hooks need the Team or Enterprise plan.

Server-side password strength is a dashboard setting (Authentication >
Providers > Email: minimum length, required characters). It should match
the app's rule (8+ characters with an uppercase letter, a number and a
symbol), or a client that skips the app can create weaker passwords.

**Decision:** accept per-IP limits for v1 rather than upgrade the plan or
build a CAPTCHA integration (hCaptcha/Turnstile are available on all plans
but need a custom WebView in React Native). Revisit if login abuse shows up,
or if the plan is upgraded (the hook then just needs wiring in the dashboard).

## Achievements stay unlocked after the log that earned them is deleted (by design, 2026-10-04)

Achievements are unlocked once, server-side, by `check_and_unlock_achievements()`
and are never revoked. Deleting the workout that completed a 7-day streak,
for example, keeps "Week One". Revoking would mean re-evaluating every
achievement on every delete, and taking a badge away for tidying up a
mistaken log feels punitive; most fitness apps keep earned awards too.

**Abuse:** someone could log fake workouts, unlock badges, then delete the
logs. Achievements only show on your own profile and to accepted friends,
they award no XP, and the 7-day log window
(`20261004010000_log_date_window.sql`) stops backfilling a long streak, so
the gain is small. Revisit if achievements ever feed a public ranking.

## Dependency vulnerabilities in build tooling (tracked 2026-08-14, rechecked 2026-10-04)

**2026-10-04:** `npm audit` reports 63 (40 excluding dev-only test tooling),
but they all come from five packages: `brace-expansion`, `braces` and
`node-forge` (Expo CLI / Metro / Babel tooling), `uuid` (via
`@expo/config-plugins` → `xcode`) and `decode-uri-component` (via
`expo-router` → `query-string`). Only the last ships in the app; it's a
denial-of-service on a malformed link, which at worst freezes the app on the
phone that opened it. The counts are high because every package depending
on those five is listed too. The fixes arrive with Expo SDK 58
(`expo-router` 58 drops the vulnerable `decode-uri-component`); until then the
note below about never running `npm audit fix --force` still applies.

**History:**

Was **24 vulnerabilities (12 high, 12 moderate)** on Expo SDK 54. The 54→57
upgrade (see below) plus a non-forced `npm audit fix` brought this down to
**15 moderate, 0 high**. All 15 remaining ones trace back to two transitive
chains Expo itself hasn't patched yet: `@expo/config-plugins` → `xcode` →
`uuid`, and `expo-router` → `query-string` → `decode-uri-component`. Both are
build-time-only tooling (native project generation / URL parsing in the CLI),
not code shipped in the compiled app bundle. `npm audit fix --force` claims
to fix them but would downgrade `expo` to `46.0.21` and `expo-router` to
`5.1.11` — **do not run it**; wait for Expo to publish a patched
`@expo/config-plugins`/`expo-router` instead, then re-run `npm audit`.

**Expo SDK 54 → 57 upgrade — done 2026-09-11.** Went through the SDK's own
required migration steps for each hop (`expo install --fix`,
`expo-doctor@latest`, `tsc --noEmit`) rather than jumping straight to 57.
Concrete fixes this required, for next time something like this comes up:
- `src/components/TabBar.tsx` imported `BottomTabBarProps` from
  `@react-navigation/bottom-tabs`, which expo-router stopped depending on in
  SDK 56 (`expo-router` and React Navigation are now independent). Fixed via
  the official codemod (`npx expo-codemod
  sdk-56-expo-router-react-navigation-replace src`), which repointed the
  import at `expo-router/js-tabs` instead — same shape, no other code changes
  needed.
- React Native 0.86 (pulled in by SDK 57) removed `StyleSheet.absoluteFillObject`,
  keeping only `StyleSheet.absoluteFill` — now the same plain, spreadable
  style object `absoluteFillObject` used to be (not the old non-spreadable
  registered-style `absoluteFill`). Not called out in Expo's own SDK 55/56/57
  changelogs since it's an RN-core change, not an Expo package change — only
  surfaced via `tsc`. Mechanically renamed across all 16 usages (9 files).
- app.json's top-level `splash` key and `newArchEnabled` flag are no longer
  valid schema (New Architecture is mandatory since SDK 55, so the flag is
  gone; splash config moved to the `expo-splash-screen` config plugin).
  Migrated `splash: { image, resizeMode, backgroundColor }` into an
  `expo-splash-screen` plugin entry with the same three fields — same visual
  result, new schema location.
- Missing peer dependency `react-native-worklets` (required by
  `react-native-reanimated`, would only surface as a crash **outside** Expo
  Go) — installed via `expo install`.
- The `@sentry/react-native` config-plugin/`@expo/config-plugins` hoisting
  gotcha from the SDK 55 attempt (see git history / old session notes) did
  **not** reproduce this time — `@expo/config-plugins@57.0.9` hoisted cleanly
  on its own, confirmed via `expo config --json --full` exiting 0. No explicit
  devDependency pin was needed; re-check this at the next major hop rather
  than assuming it stays that way.
- `expo-doctor@latest` is clean (21/21) and `tsc --noEmit` has no SDK-related
  errors as of this writing.

**Confirmed on-device 2026-09-22** in the App Store copy of Expo Go (the
check that failed for the SDK 55 attempt in 2026-08): the app ran on SDK 57
through a full session of feature work and testing, including camera and
photo-library access. Not yet verified in a standalone EAS production build.
