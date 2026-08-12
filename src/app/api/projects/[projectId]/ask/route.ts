import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/lib/supabase/server";
import { checkRateLimit, rateLimitResponse, RATE_LIMITS } from "@/lib/rate-limit";
import { getComplianceAlerts } from "@/lib/compliance";
import { toDateInput, addDays, addBusinessDays } from "@/lib/dates";
import type { InspectionType } from "@/types/database";

type ChatMessage = { role: "user" | "assistant"; content: string };
type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

// Every "create X" tool the assistant can call, keyed by name so the tool
// definition, the insert logic, and the confirmation message all live in
// one place per record type.
const ACTION_TOOLS: {
  name: string;
  description: string;
  input_schema: Anthropic.Tool.InputSchema;
  run: (
    supabase: SupabaseServerClient,
    input: Record<string, unknown>,
    ctx: { projectId: string; userId: string | null; companyId: string | null; origin: string }
  ) => Promise<{ label: string; href: string; summary: string } | { error: string }>;
}[] = [
  {
    name: "create_rfi",
    description: "Raise a new Request for Information (RFI) on this project. Use when the user asks to raise, log, create, or send an RFI.",
    input_schema: {
      type: "object",
      properties: {
        subject: { type: "string", description: "Short, specific subject line (under 10 words)." },
        question: { type: "string", description: "The formally-worded question, based on what the user described." },
        due_date: { type: "string", description: "Due date as YYYY-MM-DD, only if the user mentioned a timeframe." },
      },
      required: ["subject", "question"],
    },
    run: async (supabase, input, ctx) => {
      const { data, error } = await supabase
        .from("rfis")
        .insert({
          project_id: ctx.projectId,
          subject: String(input.subject),
          question: String(input.question),
          due_date: (input.due_date as string) || null,
          raised_by: ctx.userId,
          status: "open",
        })
        .select("id, subject")
        .single();
      if (error || !data) return { error: error?.message ?? "Couldn't create the RFI." };
      return { label: `RFI: ${data.subject}`, href: `/projects/${ctx.projectId}/rfis/${data.id}`, summary: `Created RFI "${data.subject}".` };
    },
  },
  {
    name: "create_variation",
    description: "Log a new variation (scope/cost/time change) on this project. Use when the user asks to log, raise, or record a variation or a change to the contract.",
    input_schema: {
      type: "object",
      properties: {
        title: { type: "string", description: "Short title for the variation." },
        description: { type: "string", description: "What's changing and why." },
        cost_impact: { type: "number", description: "Estimated cost impact in AUD, if mentioned." },
        time_impact_days: { type: "number", description: "Estimated schedule impact in days, if mentioned." },
        requested_by_type: { type: "string", enum: ["client", "builder"], description: "Whether the client asked for this or the builder is initiating it. Infer from context if possible; default to 'client' if genuinely unclear." },
        reason: { type: "string", description: "Why the builder is initiating it, if requested_by_type is 'builder' and a reason was given. This matters legally — variations the builder initiates need a documented reason." },
        client_name: { type: "string", description: "The client's name, if mentioned, so an approval link can be sent to them later." },
      },
      required: ["title"],
    },
    run: async (supabase, input, ctx) => {
      const { data, error } = await supabase
        .from("variations")
        .insert({
          project_id: ctx.projectId,
          title: String(input.title),
          description: (input.description as string) || null,
          cost_impact: typeof input.cost_impact === "number" ? input.cost_impact : null,
          time_impact_days: typeof input.time_impact_days === "number" ? input.time_impact_days : null,
          raised_by: ctx.userId,
          status: "draft",
          requested_by_type: (input.requested_by_type as "client" | "builder") || "client",
          reason: (input.reason as string) || null,
          client_name: (input.client_name as string) || null,
        })
        .select("id, title, client_approval_token")
        .single();
      if (error || !data) return { error: error?.message ?? "Couldn't create the variation." };
      const approvalLink = `${ctx.origin}/vary/${data.client_approval_token}`;
      return {
        label: `Variation: ${data.title}`,
        href: `/projects/${ctx.projectId}/variations/${data.id}`,
        summary: `Logged variation "${data.title}" as a draft. Client approval link — copy and send this to get their sign-off before work starts: ${approvalLink}`,
      };
    },
  },
  {
    name: "get_variation_client_link",
    description: "Look up the client approval link for a variation that already exists on this project — use when the user asks for the link (again), wants to resend it, or asks whether a variation has been signed off.",
    input_schema: {
      type: "object",
      properties: {
        title_hint: { type: "string", description: "A word or two from the variation's title/description to match against, e.g. 'retaining wall' or 'rock excavation'." },
      },
      required: ["title_hint"],
    },
    run: async (supabase, input, ctx) => {
      const hint = String(input.title_hint);
      const { data, error } = await supabase
        .from("variations")
        .select("id, title, client_approval_token, client_approved_at, client_approved_name")
        .eq("project_id", ctx.projectId)
        .or(`title.ilike.%${hint}%,description.ilike.%${hint}%`)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) return { error: error.message };
      if (!data) return { error: `Couldn't find a variation matching "${hint}" on this project.` };

      const approvalLink = `${ctx.origin}/vary/${data.client_approval_token}`;
      const signOffText = data.client_approved_at
        ? `Already signed off by ${data.client_approved_name} on ${new Date(data.client_approved_at).toLocaleDateString()}.`
        : "Not signed off yet.";
      return {
        label: `Variation: ${data.title}`,
        href: `/projects/${ctx.projectId}/variations/${data.id}`,
        summary: `Client approval link for "${data.title}": ${approvalLink} — ${signOffText}`,
      };
    },
  },
  {
    name: "create_milestone",
    description: "Add a new milestone to this project's schedule. Use when the user asks to add, create, or track a milestone.",
    input_schema: {
      type: "object",
      properties: {
        name: { type: "string", description: "Milestone name, e.g. 'Slab pour complete'." },
        target_date: { type: "string", description: "Target date as YYYY-MM-DD, if mentioned." },
      },
      required: ["name"],
    },
    run: async (supabase, input, ctx) => {
      const { data, error } = await supabase
        .from("milestones")
        .insert({ project_id: ctx.projectId, name: String(input.name), target_date: (input.target_date as string) || null, status: "pending" })
        .select("id, name")
        .single();
      if (error || !data) return { error: error?.message ?? "Couldn't create the milestone." };
      return { label: `Milestone: ${data.name}`, href: `/projects/${ctx.projectId}/milestones`, summary: `Added milestone "${data.name}".` };
    },
  },
  {
    name: "create_direction_to_rectify",
    description: "Log a QBCC Direction to Rectify on this project. Use when the user asks to log or record a direction to rectify, or a QBCC notice to fix defective work.",
    input_schema: {
      type: "object",
      properties: {
        description: { type: "string", description: "What defective or incomplete work the direction covers." },
        due_date: { type: "string", description: "Due date as YYYY-MM-DD. Defaults to 35 days out (the usual statutory clock) if not mentioned." },
      },
      required: ["description"],
    },
    run: async (supabase, input, ctx) => {
      const { data, error } = await supabase
        .from("directions_to_rectify")
        .insert({
          project_id: ctx.projectId,
          description: String(input.description),
          due_date: (input.due_date as string) || addDays(35),
          created_by: ctx.userId,
          status: "open",
        })
        .select("id, description")
        .single();
      if (error || !data) return { error: error?.message ?? "Couldn't create the direction to rectify." };
      return { label: "Direction to Rectify", href: `/projects/${ctx.projectId}/directions-to-rectify/${data.id}`, summary: "Logged a new Direction to Rectify." };
    },
  },
  {
    name: "create_payment_claim",
    description: "Log a new payment/progress claim on this project. Use when the user asks to log, record, or submit a payment claim.",
    input_schema: {
      type: "object",
      properties: {
        amount_claimed: { type: "number", description: "The amount being claimed, in AUD." },
        claim_number: { type: "string", description: "Claim number/reference, if mentioned." },
        due_date: { type: "string", description: "Payment due date as YYYY-MM-DD. Defaults to 15 business days out if not mentioned." },
      },
      required: ["amount_claimed"],
    },
    run: async (supabase, input, ctx) => {
      const dueDate = (input.due_date as string) || addBusinessDays(15);
      const { data, error } = await supabase
        .from("payment_claims")
        .insert({
          project_id: ctx.projectId,
          claim_number: (input.claim_number as string) || null,
          amount_claimed: Number(input.amount_claimed),
          due_date: dueDate,
          schedule_due_date: addBusinessDays(15),
          created_by: ctx.userId,
          status: "submitted",
        })
        .select("id, claim_number")
        .single();
      if (error || !data) return { error: error?.message ?? "Couldn't create the payment claim." };
      return { label: "Payment Claim", href: `/projects/${ctx.projectId}/payment-claims/${data.id}`, summary: `Logged a payment claim for $${Number(input.amount_claimed).toLocaleString()}.` };
    },
  },
  {
    name: "create_subcontractor",
    description: "Add a subcontractor to this project's register. Use when the user asks to add, register, or record a subcontractor.",
    input_schema: {
      type: "object",
      properties: {
        company_name: { type: "string", description: "Subcontractor's company name." },
        trade: { type: "string", description: "Trade, e.g. Electrical, Plumbing." },
        contact_name: { type: "string", description: "Contact person's name, if mentioned." },
        contact_phone: { type: "string", description: "Contact phone number, if mentioned." },
        contact_email: { type: "string", description: "Contact email, if mentioned." },
      },
      required: ["company_name"],
    },
    run: async (supabase, input, ctx) => {
      const { data, error } = await supabase
        .from("subcontractors")
        .insert({
          project_id: ctx.projectId,
          company_name: String(input.company_name),
          trade: (input.trade as string) || null,
          contact_name: (input.contact_name as string) || null,
          contact_phone: (input.contact_phone as string) || null,
          contact_email: (input.contact_email as string) || null,
        })
        .select("id, company_name")
        .single();
      if (error || !data) return { error: error?.message ?? "Couldn't add the subcontractor." };
      return { label: data.company_name, href: `/projects/${ctx.projectId}/subcontractors/${data.id}`, summary: `Added ${data.company_name} to the subcontractor register.` };
    },
  },
  {
    name: "create_inspection",
    description: "Schedule a new quality inspection (ITP hold point, witness point, or final inspection) on this project.",
    input_schema: {
      type: "object",
      properties: {
        work_area: { type: "string", description: "Work area or trade being inspected." },
        inspection_type: { type: "string", enum: ["hold_point", "witness_point", "final"], description: "Type of inspection. Default to hold_point if unclear." },
        scheduled_date: { type: "string", description: "Scheduled date as YYYY-MM-DD, if mentioned." },
      },
      required: ["work_area"],
    },
    run: async (supabase, input, ctx) => {
      const { data, error } = await supabase
        .from("inspections")
        .insert({
          project_id: ctx.projectId,
          work_area: String(input.work_area),
          inspection_type: (input.inspection_type as InspectionType) || "hold_point",
          scheduled_date: (input.scheduled_date as string) || null,
          created_by: ctx.userId,
          status: "pending",
        })
        .select("id, work_area")
        .single();
      if (error || !data) return { error: error?.message ?? "Couldn't create the inspection." };
      return { label: `Inspection: ${data.work_area}`, href: `/projects/${ctx.projectId}/inspections/${data.id}`, summary: `Scheduled an inspection for "${data.work_area}".` };
    },
  },
  {
    name: "create_ncr",
    description: "Raise a non-conformance report (NCR) on this project. Use when the user asks to raise, log, or record an NCR or non-conforming work.",
    input_schema: {
      type: "object",
      properties: {
        description: { type: "string", description: "What doesn't conform to spec/drawings/standards." },
        trade: { type: "string", description: "Trade responsible, if mentioned." },
      },
      required: ["description"],
    },
    run: async (supabase, input, ctx) => {
      const { data, error } = await supabase
        .from("non_conformance_reports")
        .insert({ project_id: ctx.projectId, description: String(input.description), trade: (input.trade as string) || null, created_by: ctx.userId, status: "open" })
        .select("id, description")
        .single();
      if (error || !data) return { error: error?.message ?? "Couldn't create the NCR." };
      return { label: "NCR", href: `/projects/${ctx.projectId}/ncrs/${data.id}`, summary: "Raised a new non-conformance report." };
    },
  },
  {
    name: "create_lead",
    description: "Log a new sales lead or enquiry for a potential job — not tied to this project. Use when the user mentions a new customer enquiry, someone asking for a quote, or a new job opportunity, even in passing.",
    input_schema: {
      type: "object",
      properties: {
        client_name: { type: "string", description: "Who the enquiry is from." },
        site_address: { type: "string", description: "Where the job is, if mentioned." },
        description: { type: "string", description: "What the job is, if mentioned." },
        estimated_value: { type: "number", description: "Rough ballpark value in AUD, if mentioned." },
      },
      required: ["client_name"],
    },
    run: async (supabase, input, ctx) => {
      if (!ctx.companyId) return { error: "Your account isn't linked to a company yet." };
      const { data, error } = await supabase
        .from("leads")
        .insert({
          company_id: ctx.companyId,
          client_name: String(input.client_name),
          site_address: (input.site_address as string) || null,
          description: (input.description as string) || null,
          estimated_value: typeof input.estimated_value === "number" ? input.estimated_value : null,
          created_by: ctx.userId,
        })
        .select("id, client_name")
        .single();
      if (error || !data) return { error: error?.message ?? "Couldn't create the lead." };
      return { label: data.client_name, href: `/leads/${data.id}`, summary: `Added ${data.client_name} as a new lead.` };
    },
  },
  {
    name: "create_material_order",
    description: "Log a materials order for this project — what's been ordered, from whom, and when it's expected. Use when the user mentions ordering, needing, or receiving materials/supplies.",
    input_schema: {
      type: "object",
      properties: {
        description: { type: "string", description: "What was ordered, e.g. '12x roof trusses'." },
        supplier: { type: "string", description: "Supplier name, if mentioned." },
        quantity_ordered: { type: "number", description: "Quantity, if mentioned." },
        unit: { type: "string", description: "Unit, e.g. m3, bags, each, if mentioned." },
        cost: { type: "number", description: "Cost in AUD, if mentioned." },
        expected_date: { type: "string", description: "Expected delivery date as YYYY-MM-DD, if mentioned." },
      },
      required: ["description"],
    },
    run: async (supabase, input, ctx) => {
      const { data, error } = await supabase
        .from("materials")
        .insert({
          project_id: ctx.projectId,
          description: String(input.description),
          supplier: (input.supplier as string) || null,
          quantity_ordered: typeof input.quantity_ordered === "number" ? input.quantity_ordered : null,
          unit: (input.unit as string) || null,
          cost: typeof input.cost === "number" ? input.cost : null,
          expected_date: (input.expected_date as string) || null,
          created_by: ctx.userId,
          status: "ordered",
        })
        .select("id, description")
        .single();
      if (error || !data) return { error: error?.message ?? "Couldn't log the material order." };
      return { label: data.description, href: `/projects/${ctx.projectId}/materials`, summary: `Logged a material order: "${data.description}".` };
    },
  },
  {
    name: "log_worker_hours",
    description: "Log hours a named worker worked on this project on a given day. If the worker isn't already on the company's worker list, one is created automatically. Use when the user mentions hours someone worked.",
    input_schema: {
      type: "object",
      properties: {
        worker_name: { type: "string", description: "The worker's name." },
        hours: { type: "number", description: "Hours worked." },
        work_date: { type: "string", description: "Date worked as YYYY-MM-DD. Defaults to today if not mentioned." },
        notes: { type: "string", description: "Any notes, if mentioned." },
      },
      required: ["worker_name", "hours"],
    },
    run: async (supabase, input, ctx) => {
      if (!ctx.companyId) return { error: "Your account isn't linked to a company yet." };
      const workerName = String(input.worker_name);

      let workerId: string | null = null;
      const { data: existing } = await supabase
        .from("workers")
        .select("id")
        .eq("company_id", ctx.companyId)
        .ilike("name", workerName)
        .maybeSingle();
      if (existing) {
        workerId = existing.id;
      } else {
        const { data: created, error: createError } = await supabase
          .from("workers")
          .insert({ company_id: ctx.companyId, name: workerName, created_by: ctx.userId })
          .select("id")
          .single();
        if (createError || !created) return { error: createError?.message ?? "Couldn't add that worker." };
        workerId = created.id;
      }

      const { error } = await supabase.from("worker_time_entries").insert({
        worker_id: workerId,
        project_id: ctx.projectId,
        hours: Number(input.hours),
        work_date: (input.work_date as string) || toDateInput(new Date()),
        notes: (input.notes as string) || null,
        created_by: ctx.userId,
      });
      if (error) return { error: error.message };
      return { label: `${workerName} — ${input.hours}h`, href: `/projects/${ctx.projectId}/worker-hours`, summary: `Logged ${input.hours}h for ${workerName}.` };
    },
  },
];

export async function POST(request: Request, { params }: { params: Promise<{ projectId: string }> }) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: "ANTHROPIC_API_KEY is not configured on the server." }, { status: 400 });
  }

  const { projectId } = await params;
  const { question, history } = (await request.json()) as { question?: string; history?: ChatMessage[] };
  if (!question?.trim()) {
    return NextResponse.json({ error: "Ask a question first." }, { status: 400 });
  }

  // Needed to build a full, shareable /vary/<token> client approval link —
  // the tool runs server-side, so there's no window.location to read.
  const origin = new URL(request.url).origin;

  const supabase = await createClient();

  const { allowed } = await checkRateLimit(supabase, RATE_LIMITS.ask);
  if (!allowed) return rateLimitResponse();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: callerProfile } = user
    ? await supabase.from("profiles").select("company_id").eq("id", user.id).single()
    : { data: null };
  const companyId = callerProfile?.company_id ?? null;

  const { data: project } = await supabase.from("projects").select("id, name, site_address, status").eq("id", projectId).single();
  if (!project) {
    return NextResponse.json({ error: "Project not found." }, { status: 404 });
  }

  const allComplianceAlerts = await getComplianceAlerts(supabase, companyId);
  const complianceAlerts = allComplianceAlerts.filter(
    (a) => a.href.startsWith(`/projects/${projectId}/`) || a.href === "/compliance"
  );

  const { data: entries } = await supabase
    .from("diary_entries")
    .select("id, entry_date, status")
    .eq("project_id", projectId)
    .order("entry_date", { ascending: false })
    .limit(20);
  const entryIds = (entries ?? []).map((e) => e.id);

  const [{ data: progressNotes }, { data: safety }, { data: rfis }, { data: variations }, { data: milestones }] = await Promise.all([
    entryIds.length
      ? supabase
          .from("progress_notes")
          .select("diary_entry_id, summary, percent_complete, delays, missing_information, outstanding_actions")
          .in("diary_entry_id", entryIds)
      : Promise.resolve({ data: [] as { diary_entry_id: string; summary: string | null; percent_complete: number | null; delays: string[] | null; missing_information: string[] | null; outstanding_actions: string[] | null }[] }),
    entryIds.length
      ? supabase.from("safety_observations").select("diary_entry_id, severity, description, action_taken").in("diary_entry_id", entryIds)
      : Promise.resolve({ data: [] as { diary_entry_id: string; severity: string; description: string; action_taken: string | null }[] }),
    supabase.from("rfis").select("subject, question, status, answer, due_date").eq("project_id", projectId).order("created_at", { ascending: false }).limit(20),
    supabase.from("variations").select("title, description, status, cost_impact, time_impact_days").eq("project_id", projectId).order("created_at", { ascending: false }).limit(20),
    supabase.from("milestones").select("name, target_date, status, notes").eq("project_id", projectId).order("target_date", { ascending: true }).limit(20),
  ]);

  const dateFor = (id: string) => entries?.find((e) => e.id === id)?.entry_date ?? "unknown date";

  const contextParts: string[] = [
    `Project: ${project.name} (${project.status})${project.site_address ? `, site: ${project.site_address}` : ""}`,
    `Today's date: ${toDateInput(new Date())}`,
  ];

  if (progressNotes?.length) {
    contextParts.push(
      "Recent site diary progress notes:\n" +
        progressNotes
          .map((p) => {
            const bits = [`- [${dateFor(p.diary_entry_id)}] ${p.summary ?? "(no summary)"}${p.percent_complete !== null ? ` (${p.percent_complete}% complete)` : ""}`];
            if (p.delays?.length) bits.push(`  Delays: ${p.delays.join("; ")}`);
            if (p.missing_information?.length) bits.push(`  Missing info: ${p.missing_information.join("; ")}`);
            if (p.outstanding_actions?.length) bits.push(`  Outstanding actions: ${p.outstanding_actions.join("; ")}`);
            return bits.join("\n");
          })
          .join("\n")
    );
  }

  if (safety?.length) {
    contextParts.push(
      "Safety observations:\n" + safety.map((s) => `- [${s.severity}, ${dateFor(s.diary_entry_id)}] ${s.description}`).join("\n")
    );
  }

  if (rfis?.length) {
    contextParts.push(
      "RFIs:\n" +
        rfis.map((r) => `- [${r.status}] ${r.subject}: ${r.question}${r.answer ? ` — Answer: ${r.answer}` : ""}`).join("\n")
    );
  }

  if (variations?.length) {
    contextParts.push(
      "Variations:\n" +
        variations
          .map(
            (v) =>
              `- [${v.status}] ${v.title}${v.cost_impact !== null ? ` ($${v.cost_impact})` : ""}${
                v.time_impact_days !== null ? ` (${v.time_impact_days} days)` : ""
              }`
          )
          .join("\n")
    );
  }

  if (milestones?.length) {
    contextParts.push(
      "Milestones:\n" + milestones.map((m) => `- [${m.status}] ${m.name}${m.target_date ? ` (target ${m.target_date})` : ""}`).join("\n")
    );
  }

  contextParts.push(
    complianceAlerts.length
      ? "Compliance status (computed from real data — Directions to Rectify, BIF Act supporting statements, licence/MFR expiry, deposit cap, retention):\n" +
          complianceAlerts.map((a) => `- [${a.severity === "red" ? "action needed" : "watch"}] ${a.message}`).join("\n")
      : "Compliance status: no compliance risks currently detected for this project or company (no overdue Directions to Rectify, no payment claims missing a supporting statement, licence/MFR reporting up to date, no deposit cap issues)."
  );

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const conversation: Anthropic.MessageParam[] = [
    ...(history ?? []).slice(-10).map((m) => ({ role: m.role, content: m.content }) as Anthropic.MessageParam),
    { role: "user", content: question.trim() },
  ];

  const message = await anthropic.messages.create({
    model: "claude-sonnet-4-5",
    max_tokens: 1024,
    tools: ACTION_TOOLS.map((t) => ({ name: t.name, description: t.description, input_schema: t.input_schema })),
    system: [
      "You are Ask CivFlow, an assistant embedded in a construction site management app.",
      "You can do two things: answer questions using ONLY the project data provided below, and take action by calling a tool to create a record (RFI, variation, milestone, direction to rectify, payment claim, subcontractor, inspection, NCR, sales lead, material order, or logged worker hours) when the user clearly asks you to.",
      "Creating a variation always returns a client approval link in the result — that's expected, always surface it plainly so the user can copy it. If the user later asks for a variation's link again, or asks whether a variation has been signed off, use get_variation_client_link rather than guessing from the Variations list below (which doesn't include the link).",
      "When the user asks a question, answer concisely and practically from the data — don't invent facts, and say so plainly if the data doesn't cover it.",
      "If the user asks something like 'am I compliant', 'any compliance issues', or 'are we okay on QBCC/BIF Act stuff', answer directly from the Compliance status block below — name the specific issues (or confirm there are none) rather than giving generic advice. Always add that this is a tracking aid, not a substitute for checking directly with the QBCC.",
      "When the user asks you to create/raise/log/add/schedule something that matches one of your tools, call that tool. Fill in fields from what the user told you (and this conversation's history) — don't invent specifics they didn't give you (like a cost figure or a name) unless it was actually mentioned.",
      "If a required field is missing (e.g. no question text for an RFI, no company name for a subcontractor), don't call the tool — ask a short clarifying question in plain text instead.",
      "Only call one tool per message, for the single most recent request.",
      "",
      contextParts.join("\n\n") || "No project data has been logged yet.",
    ].join("\n"),
    messages: conversation,
  });

  const textBlock = message.content.find((b): b is Anthropic.TextBlock => b.type === "text");
  const toolUse = message.content.find((b): b is Anthropic.ToolUseBlock => b.type === "tool_use");

  if (toolUse) {
    const tool = ACTION_TOOLS.find((t) => t.name === toolUse.name);
    if (!tool) {
      return NextResponse.json({ answer: textBlock?.text ?? "I tried to take an action I don't actually support. Try rephrasing." });
    }
    const result = await tool.run(supabase, toolUse.input as Record<string, unknown>, { projectId, userId: user?.id ?? null, companyId, origin });
    if ("error" in result) {
      return NextResponse.json({ answer: `${textBlock?.text ?? ""}\n\nI couldn't do that: ${result.error}`.trim() });
    }
    return NextResponse.json({
      answer: textBlock?.text ?? result.summary,
      action: { label: result.label, href: result.href, summary: result.summary },
    });
  }

  return NextResponse.json({ answer: textBlock?.text ?? "I couldn't come up with an answer." });
}
