# Known Issues

## Login lockout is client-side only (accepted risk, 2026-08-14)

`src/utils/rateLimiter.ts` locks an account out after repeated failed
logins, but it only runs on-device — anyone calling Supabase's password
sign-in endpoint directly (curl, Postman, a script) skips it entirely and
can attempt passwords without limit as far as this app's own code is
concerned.

The intended real fix — a Supabase Auth Hook
(`supabase/migrations/20260814000000_password_verification_rate_limit.sql`,
which creates the table/function for it) — is written but **not active**:
enabling Auth Hooks in the dashboard requires the Team or Enterprise
Supabase plan, and this project is not on one. Also unconfirmed: Supabase's
own [documented rate limits](https://supabase.com/docs/guides/auth/rate-limits)
don't list a specific limit for password sign-in itself (unlike signup,
password-recovery emails, OTP, etc.), so there may be little to no
platform-level backstop today beyond generic abuse protection — worth
checking Dashboard > Authentication > Rate Limits directly to confirm what,
if anything, applies.

**Decision:** accept this risk for now rather than block on a plan upgrade
or build a CAPTCHA-based alternative (Supabase supports hCaptcha/Turnstile
on all plans, but it's web-widget-first — no official React Native/Expo
guidance, so it'd mean a custom WebView integration). Revisit if the
Supabase plan is ever upgraded (the hook migration is already written and
just needs wiring in the dashboard — see the migration file) or if login
abuse actually shows up in practice.

## Dependency vulnerabilities in build tooling (tracked 2026-08-14, upgraded 2026-09-11)

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
