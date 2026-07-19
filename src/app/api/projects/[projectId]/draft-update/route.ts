import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/lib/supabase/server";
import { checkRateLimit, rateLimitResponse, RATE_LIMITS } from "@/lib/rate-limit";

// Drafts a short, client-ready paragraph summarizing recent progress —
// pulled from the same diary/progress-note data the client report and
// portal already surface, just turned into prose instead of a table. The
// builder reviews and edits before actually sending it anywhere; this
// route never contacts the client itself.

export async function POST(request: Request, { params }: { params: Promise<{ projectId: string }> }) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: "ANTHROPIC_API_KEY is not configured on the server." }, { status: 400 });
  }

  const { projectId } = await params;
  const supabase = await createClient();

  const { allowed } = await checkRateLimit(supabase, RATE_LIMITS.draftUpdate);
  if (!allowed) return rateLimitResponse();

  const { data: project } = await supabase.from("projects").select("id, name, site_address").eq("id", projectId).single();
  if (!project) {
    return NextResponse.json({ error: "Project not found." }, { status: 404 });
  }

  const { data: entries } = await supabase
    .from("diary_entries")
    .select("id, entry_date")
    .eq("project_id", projectId)
    .eq("status", "approved")
    .order("entry_date", { ascending: false })
    .limit(6);
  const entryIds = (entries ?? []).map((e) => e.id);

  const [{ data: progressNotes }, { data: pendingVariations }, { data: milestones }] = await Promise.all([
    entryIds.length
      ? supabase
          .from("progress_notes")
          .select("diary_entry_id, summary, percent_complete, delays, outstanding_actions")
          .in("diary_entry_id", entryIds)
      : Promise.resolve({ data: [] as { diary_entry_id: string; summary: string | null; percent_complete: number | null; delays: string[] | null; outstanding_actions: string[] | null }[] }),
    supabase.from("variations").select("title, cost_impact").eq("project_id", projectId).in("status", ["draft", "submitted"]),
    supabase.from("milestones").select("name, status, target_date").eq("project_id", projectId).order("target_date", { ascending: true }).limit(10),
  ]);

  const dateFor = (id: string) => entries?.find((e) => e.id === id)?.entry_date ?? "unknown date";

  if (!progressNotes?.length && !pendingVariations?.length && !milestones?.length) {
    return NextResponse.json({ error: "Not enough logged yet on this project to draft an update from." }, { status: 400 });
  }

  const contextParts: string[] = [`Project: ${project.name}${project.site_address ? `, site: ${project.site_address}` : ""}`];

  if (progressNotes?.length) {
    contextParts.push(
      "Recent site diary progress notes (most recent first):\n" +
        progressNotes
          .map((p) => {
            const bits = [`- [${dateFor(p.diary_entry_id)}] ${p.summary ?? "(no summary)"}${p.percent_complete !== null ? ` (${p.percent_complete}% complete)` : ""}`];
            if (p.delays?.length) bits.push(`  Delays: ${p.delays.join("; ")}`);
            if (p.outstanding_actions?.length) bits.push(`  Outstanding: ${p.outstanding_actions.join("; ")}`);
            return bits.join("\n");
          })
          .join("\n")
    );
  }

  if (pendingVariations?.length) {
    contextParts.push(
      "Variations awaiting the client's decision:\n" +
        pendingVariations.map((v) => `- ${v.title}${v.cost_impact !== null ? ` ($${v.cost_impact.toLocaleString()})` : ""}`).join("\n")
    );
  }

  if (milestones?.length) {
    contextParts.push(
      "Upcoming/relevant milestones:\n" +
        milestones.map((m) => `- [${m.status}] ${m.name}${m.target_date ? ` (target ${m.target_date})` : ""}`).join("\n")
    );
  }

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const message = await anthropic.messages.create({
    model: "claude-sonnet-4-5",
    max_tokens: 400,
    system: [
      "You draft short, friendly, client-facing progress updates for a residential builder to send as-is (email or text) after reviewing.",
      "Write 2-4 sentences of plain prose — no headers, no bullet points, no markdown. Plain, warm, professional tone, not overly formal.",
      "Base it ONLY on the data given below — don't invent progress, dates, or figures that aren't there.",
      "If there are delays or outstanding items, mention them plainly and reassuringly rather than glossing over them.",
      "If there's a variation awaiting the client's decision, mention that they still need to review/approve it.",
      "Don't include a greeting ('Hi [Name]') or sign-off — just the update paragraph itself, since the builder will add those.",
      "",
      contextParts.join("\n\n"),
    ].join("\n"),
    messages: [{ role: "user", content: "Draft the client update." }],
  });

  const textBlock = message.content.find((b): b is Anthropic.TextBlock => b.type === "text");
  if (!textBlock?.text) {
    return NextResponse.json({ error: "Couldn't draft an update." }, { status: 500 });
  }

  return NextResponse.json({ draft: textBlock.text.trim() });
}
