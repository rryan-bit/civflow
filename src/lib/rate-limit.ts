import { createClient } from "@/lib/supabase/server";

/**
 * Per-user, per-route rate limiting for the AI-backed API routes, backed by
 * the `check_ai_rate_limit` Postgres function (see
 * supabase/migrations/0004_rate_limiting.sql). The count-then-insert happens
 * atomically in the database so concurrent requests can't race past the
 * limit — no external service (Redis, Upstash, etc.) required.
 *
 * Each route picks limits proportional to how expensive the call is:
 * extraction (vision + transcription) is capped much tighter than a quick
 * chat message.
 */
export const RATE_LIMITS = {
  extraction: { route: "extraction", limit: 15, windowMinutes: 60 },
  rfiDraft: { route: "rfi_draft", limit: 30, windowMinutes: 60 },
  toolboxTalk: { route: "toolbox_talk", limit: 20, windowMinutes: 60 },
  ask: { route: "ask", limit: 40, windowMinutes: 60 },
  dashboardAsk: { route: "dashboard_ask", limit: 40, windowMinutes: 60 },
  documentFile: { route: "document_file", limit: 15, windowMinutes: 60 },
  draftUpdate: { route: "draft_update", limit: 20, windowMinutes: 60 },
  xeroPush: { route: "xero_push", limit: 30, windowMinutes: 60 },
} as const;

export type RateLimitConfig = (typeof RATE_LIMITS)[keyof typeof RATE_LIMITS];

export async function checkRateLimit(
  supabase: Awaited<ReturnType<typeof createClient>>,
  config: RateLimitConfig
): Promise<{ allowed: boolean }> {
  const { data, error } = await supabase.rpc("check_ai_rate_limit", {
    p_route: config.route,
    p_limit: config.limit,
    p_window_minutes: config.windowMinutes,
  });

  // Fail open on an unexpected DB error — a broken limiter shouldn't take
  // down the feature — but fail closed if the RPC explicitly says no.
  if (error) {
    console.error("Rate limit check failed:", error.message);
    return { allowed: true };
  }

  return { allowed: data === true };
}

export function rateLimitResponse() {
  return Response.json(
    { error: "You've hit the hourly limit for this AI feature. Try again shortly." },
    { status: 429 }
  );
}
