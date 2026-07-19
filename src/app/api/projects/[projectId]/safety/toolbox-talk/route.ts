import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/lib/supabase/server";
import { checkRateLimit, rateLimitResponse, RATE_LIMITS } from "@/lib/rate-limit";

const TOOL_NAME = "draft_toolbox_talk";

export async function POST(request: Request, { params }: { params: Promise<{ projectId: string }> }) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: "ANTHROPIC_API_KEY is not configured on the server." }, { status: 400 });
  }

  const { projectId } = await params;
  const { focus } = (await request.json().catch(() => ({}))) as { focus?: string };

  const supabase = await createClient();

  const { allowed } = await checkRateLimit(supabase, RATE_LIMITS.toolboxTalk);
  if (!allowed) return rateLimitResponse();

  const { data: entries } = await supabase.from("diary_entries").select("id").eq("project_id", projectId);
  const entryIds = (entries ?? []).map((e) => e.id);

  let observations: { severity: string; description: string; action_taken: string | null }[] = [];
  if (entryIds.length) {
    const { data } = await supabase
      .from("safety_observations")
      .select("severity, description, action_taken")
      .in("diary_entry_id", entryIds)
      .order("id", { ascending: false })
      .limit(15);
    observations = data ?? [];
  }

  if (!observations.length && !focus?.trim()) {
    return NextResponse.json(
      { error: "No safety observations logged on this project yet — add a focus topic to generate a talk anyway." },
      { status: 400 }
    );
  }

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const promptParts = [
    "You're a construction site safety officer preparing a short toolbox talk for the crew's morning briefing.",
    observations.length
      ? `Recent safety observations logged on this site:\n${observations
          .map((o) => `- [${o.severity}] ${o.description}${o.action_taken ? ` (action taken: ${o.action_taken})` : ""}`)
          .join("\n")}`
      : "No recent safety observations are logged for this site.",
    focus?.trim() ? `The supervisor wants the talk to focus specifically on: "${focus.trim()}"` : "",
    "Draft a toolbox talk grounded in what's actually been observed on this site (don't invent incidents). Keep it practical and speakable in under 5 minutes.",
  ].filter(Boolean);

  const message = await anthropic.messages.create({
    model: "claude-sonnet-4-5",
    max_tokens: 1024,
    tools: [
      {
        name: TOOL_NAME,
        description: "Draft a short toolbox talk for a site safety briefing.",
        input_schema: {
          type: "object",
          properties: {
            topic: { type: "string", description: "Short topic title for the talk." },
            talking_points: {
              type: "array",
              items: { type: "string" },
              description: "3-6 concise points the supervisor should say out loud, in order.",
            },
            questions: {
              type: "array",
              items: { type: "string" },
              description: "1-3 questions to ask the crew to check understanding / surface issues.",
            },
          },
          required: ["topic", "talking_points", "questions"],
        },
      },
    ],
    tool_choice: { type: "tool", name: TOOL_NAME },
    messages: [{ role: "user", content: promptParts.join("\n\n") }],
  });

  const toolUse = message.content.find(
    (block): block is Anthropic.ToolUseBlock => block.type === "tool_use" && block.name === TOOL_NAME
  );

  if (!toolUse) {
    return NextResponse.json({ error: "Claude didn't return a draft. Try again." }, { status: 500 });
  }

  return NextResponse.json(toolUse.input);
}
