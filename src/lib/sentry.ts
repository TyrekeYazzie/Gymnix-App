import * as Sentry from '@sentry/react-native';

// Crash reporting is opt-in: it only turns on once EXPO_PUBLIC_SENTRY_DSN is
// set (see .env). Until a Sentry project exists, this is a no-op, so the
// app behaves identically with or without one configured — nothing here
// blocks shipping before that account exists.
const dsn = process.env.EXPO_PUBLIC_SENTRY_DSN;

// Strip anything that could identify a user or leak a live credential
// before an event ever leaves the device. The app never calls
// Sentry.setUser(), so event.user is already empty in practice — this is
// defense in depth for if that changes later. The real risk is automatic
// captures: navigation/HTTP breadcrumbs can include full URLs (the
// password-reset deep link carries a one-time PKCE `code` in its query
// string), and in principle, request headers (Supabase's anon key and a
// signed-in user's bearer token).
const REDACTED = '[redacted]';
const SENSITIVE_HEADERS = ['authorization', 'apikey', 'x-supabase-api-key'];

function stripQueryString(url?: string): string | undefined {
  if (!url) return url;
  const i = url.indexOf('?');
  return i === -1 ? url : `${url.slice(0, i)}?${REDACTED}`;
}

function scrubHeaders(headers?: Record<string, string>): Record<string, string> | undefined {
  if (!headers) return headers;
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(headers)) {
    out[key] = SENSITIVE_HEADERS.includes(key.toLowerCase()) ? REDACTED : value;
  }
  return out;
}

if (dsn) {
  Sentry.init({
    dsn,
    // Local dev runs are usually you poking at something broken on
    // purpose — keep that noise out of the dashboard. Preview/production
    // EAS builds have __DEV__ false, so those always report.
    enabled: !__DEV__,
    // Traces carry the same breadcrumb/URL/header data as error events, so
    // they're the same PII surface handled in beforeSend below — sampled
    // down rather than 100% to shrink that surface (and cost) rather than
    // relying on scrubbing alone. Revisit once there's real user volume.
    tracesSampleRate: 0.2,
    // Don't let the SDK auto-attach IP address or other default-PII fields.
    sendDefaultPii: false,
    beforeSend(event) {
      // No code path sets this today, but don't let a future change start
      // shipping it silently.
      delete event.user;

      if (event.request) {
        event.request.headers = scrubHeaders(event.request.headers as Record<string, string> | undefined);
        event.request.url = stripQueryString(event.request.url);
        delete event.request.cookies;
      }

      event.breadcrumbs = event.breadcrumbs?.map((crumb) => {
        if (crumb.data?.url) crumb.data.url = stripQueryString(crumb.data.url as string);
        if (crumb.data?.to) crumb.data.to = stripQueryString(crumb.data.to as string);
        if (crumb.data?.from) crumb.data.from = stripQueryString(crumb.data.from as string);
        if (crumb.data?.headers) crumb.data.headers = scrubHeaders(crumb.data.headers as Record<string, string>);
        return crumb;
      });

      return event;
    },
  });
}

export { Sentry };
