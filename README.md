# Gymnix

An iPhone/Android fitness tracker: log workouts, cardio, meals, water and
weight; earn XP and ranks; compete with friends on leaderboards.

Built with Expo (SDK 57, React Native, expo-router, TypeScript) on a
Supabase backend (Postgres with row-level security, Auth, Storage).

## Run it locally

1. `npm install`
2. Copy `.env.example` to `.env` and fill in the Supabase URL and anon key
   (Supabase dashboard → Project Settings → API). Never commit `.env`.
3. `npx expo start`, then scan the QR code with Expo Go on your phone.

Run the unit tests with `npm test`, check types with `npx tsc --noEmit`,
and check project health with `npx expo-doctor`.

## Where things live

| Path | What |
|---|---|
| `src/app/` | Screens (expo-router: file name = route) |
| `src/components/logs/` | The five log sheets (workout, cardio, meals, water, weight) |
| `src/lib/` | Supabase client, auth, XP, leaderboards, friends |
| `src/utils/` | Validation, photo upload/cleanup, small helpers |
| `supabase/migrations/` | Database schema and security rules (see `supabase/README.md`) |
| `supabase/tests/` | Two-account data isolation test (run in the SQL Editor) |
| `site/` | Public web pages: privacy policy, terms, password-reset hand-off |
| `KNOWN_ISSUES.md` | Accepted limitations and why |

## Important rules

- **XP is awarded by the database** (triggers on the log tables), never by
  the app. Clients can't write `total_xp`.
- **Real names are private.** Leaderboards and search show `@username`;
  full names only reach accepted friends.
- **Workout set weights are stored in kg** (`{ reps, weight, unit: 'kg' }`)
  and converted for display.
- Schema changes go in a new migration file; never edit an applied one.

## Builds

EAS profiles are in `eas.json` (`development`, `preview`, `production`).
Production environment variables live on expo.dev, not in `.env`.
