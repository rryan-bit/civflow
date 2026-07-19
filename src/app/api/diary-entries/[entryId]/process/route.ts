import { NextResponse } from "next/server";
import { runExtraction } from "@/lib/ai/extract";
import { createClient } from "@/lib/supabase/server";
import { checkRateLimit, rateLimitResponse, RATE_LIMITS } from "@/lib/rate-limit";

export async function POST(_request: Request, { params }: { params: Promise<{ entryId: string }> }) {
  const { entryId } = await params;

  const supabase = await createClient();
  const { allowed } = await checkRateLimit(supabase, RATE_LIMITS.extraction);
  if (!allowed) return rateLimitResponse();

  const result = await runExtraction(entryId);

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json(result);
}
