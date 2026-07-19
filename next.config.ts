import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {
  /* config options here */
};

// withSentryConfig no-ops gracefully (with a console note) if
// SENTRY_AUTH_TOKEN/org/project aren't set — source map upload just gets
// skipped, the build itself doesn't fail. Runtime error capture (which is
// what actually matters day to day) only needs NEXT_PUBLIC_SENTRY_DSN,
// configured in the *.config.ts / instrumentation files.
export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  silent: true,
  widenClientFileUpload: false,
  telemetry: false,
});
