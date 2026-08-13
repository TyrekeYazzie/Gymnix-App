import * as Sentry from '@sentry/react-native';

// Crash reporting is opt-in: it only turns on once EXPO_PUBLIC_SENTRY_DSN is
// set (see .env). Until a Sentry project exists, this is a no-op, so the
// app behaves identically with or without one configured — nothing here
// blocks shipping before that account exists.
const dsn = process.env.EXPO_PUBLIC_SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    // Local dev runs are usually you poking at something broken on
    // purpose — keep that noise out of the dashboard. Preview/production
    // EAS builds have __DEV__ false, so those always report.
    enabled: !__DEV__,
    tracesSampleRate: 1.0,
  });
}

export { Sentry };
