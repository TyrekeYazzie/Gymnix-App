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

## Dependency vulnerabilities in build tooling (tracked 2026-08-14)

`npm audit` reports **24 vulnerabilities (12 high, 12 moderate, 0 critical)**.
All of them trace back to build-time tooling pulled in by Expo — `@expo/cli`,
the Metro bundler, `xcode`, `uuid` — not code that ends up inside the
compiled app bundle a user's phone actually runs. Confirmed via
`npm audit --json`: every affected package sits under the `@expo/cli`
dependency tree, and `fixAvailable` for all of them points to the same fix —
upgrading `expo` from `~54.0.36` to `57.0.13`, a semver-major jump.

**Why this isn't fixed opportunistically:** a major Expo SDK bump touches the
native build pipeline, config plugins, and potentially breaking changes
across every `expo-*` package in `package.json` — it deserves its own
tracked upgrade with a real regression pass (auth, image picker, secure
store, notifications config, EAS build profiles), not a drive-by fix bundled
into an unrelated session.

**Next step:** schedule a dedicated "Expo SDK 54 → 57 upgrade" pass. Before
starting it, re-run `npm audit` to confirm the vulnerability count/severity
hasn't changed, and check the [Expo SDK 57 changelog](https://expo.dev/changelog)
for breaking changes against packages this app uses directly (`expo-router`,
`expo-secure-store`, `expo-image-picker`, `expo-file-system`,
`react-native-reanimated`).
