// Sentry error monitoring — edge runtime (middleware). See
// sentry.server.config.ts for the DSN note.
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 0.1,
});
