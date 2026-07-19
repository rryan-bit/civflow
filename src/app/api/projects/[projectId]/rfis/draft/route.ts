import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/lib/supabase/server";
import { checkRateLimit, rateLimitResponse, RATE_LIMITS } from "@/lib/rate-limit";

const DRAFT_TOOL_NAME = "draft_rfi";

export async function POST(request: Request) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: "ANTHROPIC_API_KEY is not configured on the server." }, { status: 400 });
  }

  const supabase = await createClient();
  const { allowed } = await checkRateLimit(supabase, RATE_LIMITS.rfiDraft);
  if (!allowed) return rateLimitResponse();

  const { note } = (await request.json()) as { note?: string };
  if (!note?.trim()) {
    return NextResponse.json({ error: "Describe the issue first." }, { status: 400 });
  }

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const message = await anthropic.messages.create({
    model: "claude-sonnet-4-5",
    max_tokens: 1024,
    tools: [
      {
        name: DRAFT_TOOL_NAME,
        description: "Draft a formal Request for Information (RFI) from a supervisor's rough note.",
        input_schema: {
          type: "object",
          properties: {
            subject: { type: "string", description: "A short, specific subject line (under 10 words)." },
            question: {
              type: "string",
              description: "A clear, formally-worded question a design team or client could act on, based on the rough note. Don't add facts not implied by the note.",
            },
          },
          required: ["subject", "question"],
        },
      },
    ],
    tool_choice: { type: "tool", name: DRAFT_TOOL_NAME },
    messages: [
      {
        role: "user",
        content: `A site supervisor wrote this rough note describing something they need clarified: "${note.trim()}"\n\nDraft it as a formal RFI.`,
      },
    ],
  });

  const toolUse = message.content.find(
    (block): block is Anthropic.ToolUseBlock => block.type === "tool_use" && block.name === DRAFT_TOOL_NAME
  );

  if (!toolUse) {
    return NextResponse.json({ error: "Claude didn't return a draft. Try again." }, { status: 500 });
  }

  return NextResponse.json(toolUse.input);
}
