// Sentry error monitoring — browser runtime. See sentry.server.config.ts
// for the DSN note; this file is picked up automatically by Next.js.
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 0.1,
  // Session replay is disabled by default — site diary photos/voice notes
  // are sensitive; don't record screens without an explicit opt-in later.
  replaysSessionSampleRate: 0,
  replaysOnErrorSampleRate: 0,
});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
