// Sentry error monitoring — server runtime. No-ops gracefully if
// NEXT_PUBLIC_SENTRY_DSN isn't set (e.g. local dev), so this is safe to ship
// without every developer needing a Sentry account. Get a free DSN at
// https://sentry.io — Settings > Projects > (create one) > Client Keys.
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 0.1,
  // Site diary uploads are the most failure-prone path (network + storage +
  // AI calls) — keep a slightly larger buffer of breadcrumbs around them.
  maxBreadcrumbs: 50,
});
