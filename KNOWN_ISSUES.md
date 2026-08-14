# Known Issues

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
