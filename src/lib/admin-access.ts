// Gate for the platform-wide /admin control panel — deliberately NOT a
// database role or RLS carve-out (every other permission boundary in this
// app is company-scoped by design; a platform admin needs to see across
// every company, which is a fundamentally different, much more powerful
// thing). Kept as a tiny email allowlist checked server-side, the same
// "env var as the source of truth" pattern already used for CRON_SECRET —
// simple to reason about, simple to extend when a cofounder needs adding,
// and there's no path for it to leak into anything RLS-governed.

const DEFAULT_ADMIN_EMAILS = ["rryanmahon@gmail.com"];

export function getPlatformAdminEmails(): string[] {
  const fromEnv = (process.env.PLATFORM_ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  return [...new Set([...DEFAULT_ADMIN_EMAILS, ...fromEnv])];
}

export function isPlatformAdmin(email: string | null | undefined): boolean {
  if (!email) return false;
  return getPlatformAdminEmails().includes(email.toLowerCase());
}
