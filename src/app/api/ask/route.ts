import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/lib/supabase/server";
import { checkRateLimit, rateLimitResponse, RATE_LIMITS } from "@/lib/rate-limit";
import { getComplianceAlerts } from "@/lib/compliance";
import { toDateInput, addDays, addBusinessDays } from "@/lib/dates";
import type { InspectionType, ProjectStatus } from "@/types/database";

// The dashboard-wide sibling of /api/projects/[projectId]/ask — same
// tool-calling pattern, but not scoped to a single project. Lets a builder
// create a brand-new project OR log something ("received a delivery of
// roof trusses for the Chen job") against any of their existing projects,
// all from the dashboard, without opening the project first. Every
// project-scoped tool below takes a `project_name_hint` and resolves it
// against the company's projects with resolveProject() rather than trusting
// a projectId from the URL, since there isn't one here.

type ChatMessage = { role: "user" | "assistant"; content: string };
type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;
type Ctx = { userId: string | null; companyId: string | null; origin: string };
type ToolResult = { label: string; href: string; summary: string } | { error: string };

async function resolveProject(
  supabase: SupabaseServerClient,
  companyId: string | null,
  hint: string
): Promise<{ project: { id: string; name: string } } | { error: string }> {
  if (!companyId) return { error: "Your account isn't linked to a company yet." };
  const { data: matches, error } = await supabase
    .from("projects")
    .select("id, name")
    .eq("company_id", companyId)
    .ilike("name", `%${hint}%`);
  if (error) return { error: error.message };
  if (!matches?.length) {
    return { error: `Couldn't find a project matching "${hint}". Check the spelling, or open the project directly to log it there.` };
  }
  if (matches.length > 1) {
    return { error: `More than one project matches "${hint}": ${matches.map((m) => m.name).join(", ")}. Try naming it more specifically.` };
  }
  return { project: matches[0] };
}

const ACTION_TOOLS: {
  name: string;
  description: string;
  input_schema: Anthropic.Tool.InputSchema;
  run: (supabase: SupabaseServerClient, input: Record<string, unknown>, ctx: Ctx) => Promise<ToolResult>;
}[] = [
  {
    name: "create_project",
    description: "Create a brand-new project. Use when the user describes a new job to set up — a client, a site, scope of work.",
    input_schema: {
      type: "object",
      properties: {
        name: { type: "string", description: "Short project name, e.g. 'Chen Duplex' or client + job type." },
        site_address: { type: "string", description: "Site address, if mentioned." },
        status: { type: "string", enum: ["active", "archived"], description: "Almost always 'active' for a new job." },
        subcontractors: {
          type: "array",
          description: "Any subcontractors mentioned by name/trade.",
          items: {
            type: "object",
            properties: {
              company_name: { type: "string" },
              trade: { type: "string" },
              contact_name: { type: "string" },
              contact_phone: { type: "string" },
              contact_email: { type: "string" },
            },
            required: ["company_name"],
          },
        },
        milestones: {
          type: "array",
          description: "Any key dates mentioned.",
          items: {
            type: "object",
            properties: {
              name: { type: "string" },
              target_date: { type: "string", description: "YYYY-MM-DD, resolved against today's date." },
            },
            required: ["name"],
          },
        },
      },
      required: ["name"],
    },
    run: async (supabase, input, ctx) => {
      if (!ctx.companyId) return { error: "Your account isn't linked to a company yet." };
      const { data: project, error } = await supabase
        .from("projects")
        .insert({
          company_id: ctx.companyId,
          name: String(input.name),
          site_address: (input.site_address as string) || null,
          status: (input.status as ProjectStatus) || "active",
        })
        .select("id, name")
        .single();
      if (error || !project) return { error: error?.message ?? "Couldn't create the project." };

      const subs = Array.isArray(input.subcontractors)
        ? (input.subcontractors as Record<string, unknown>[]).filter((s) => typeof s.company_name === "string" && s.company_name.trim())
        : [];
      if (subs.length) {
        await supabase.from("subcontractors").insert(
          subs.map((s) => ({
            project_id: project.id,
            company_name: String(s.company_name),
            trade: (s.trade as string) || null,
            contact_name: (s.contact_name as string) || null,
            contact_phone: (s.contact_phone as string) || null,
            contact_email: (s.contact_email as string) || null,
          }))
        );
      }

      const milestones = Array.isArray(input.milestones)
        ? (input.milestones as Record<string, unknown>[]).filter((m) => typeof m.name === "string" && m.name.trim())
        : [];
      if (milestones.length) {
        await supabase.from("milestones").insert(
          milestones.map((m) => ({
            project_id: project.id,
            name: String(m.name),
            target_date: (m.target_date as string) || null,
            status: "pending",
          }))
        );
      }

      return {
        label: `Project: ${project.name}`,
        href: `/projects/${project.id}`,
        summary: `Created project "${project.name}"${subs.length ? ` with ${subs.length} subcontractor(s)` : ""}${milestones.length ? ` and ${milestones.length} milestone(s)` : ""}.`,
      };
    },
  },
  {
    name: "create_rfi",
    description: "Raise a new Request for Information (RFI) on an existing project. Use when the user asks to raise, log, create, or send an RFI.",
    input_schema: {
      type: "object",
      properties: {
        project_name_hint: { type: "string", description: "Which project this is for — a name or a distinctive word/two from it." },
        subject: { type: "string", description: "Short, specific subject line (under 10 words)." },
        question: { type: "string", description: "The formally-worded question, based on what the user described." },
        due_date: { type: "string", description: "Due date as YYYY-MM-DD, only if the user mentioned a timeframe." },
      },
      required: ["project_name_hint", "subject", "question"],
    },
    run: async (supabase, input, ctx) => {
      const resolved = await resolveProject(supabase, ctx.companyId, String(input.project_name_hint));
      if ("error" in resolved) return resolved;
      const { data, error } = await supabase
        .from("rfis")
        .insert({
          project_id: resolved.project.id,
          subject: String(input.subject),
          question: String(input.question),
          due_date: (input.due_date as string) || null,
          raised_by: ctx.userId,
          status: "open",
        })
        .select("id, subject")
        .single();
      if (error || !data) return { error: error?.message ?? "Couldn't create the RFI." };
      return { label: `RFI: ${data.subject}`, href: `/projects/${resolved.project.id}/rfis/${data.id}`, summary: `Created RFI "${data.subject}" on ${resolved.project.name}.` };
    },
  },
  {
    name: "create_variation",
    description: "Log a new variation (scope/cost/time change) on an existing project. Use when the user asks to log, raise, or record a variation or a change to the contract.",
    input_schema: {
      type: "object",
      properties: {
        project_name_hint: { type: "string", description: "Which project this is for — a name or a distinctive word/two from it." },
        title: { type: "string", description: "Short title for the variation." },
        description: { type: "string", description: "What's changing and why." },
        cost_impact: { type: "number", description: "Estimated cost impact in AUD, if mentioned." },
        time_impact_days: { type: "number", description: "Estimated schedule impact in days, if mentioned." },
        requested_by_type: { type: "string", enum: ["client", "builder"], description: "Whether the client asked for this or the builder is initiating it. Infer from context; default to 'client' if genuinely unclear." },
        reason: { type: "string", description: "Why the builder is initiating it, if requested_by_type is 'builder'." },
        client_name: { type: "string", description: "The client's name, if mentioned." },
      },
      required: ["project_name_hint", "title"],
    },
    run: async (supabase, input, ctx) => {
      const resolved = await resolveProject(supabase, ctx.companyId, String(input.project_name_hint));
      if ("error" in resolved) return resolved;
      const { data, error } = await supabase
        .from("variations")
        .insert({
          project_id: resolved.project.id,
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
        href: `/projects/${resolved.project.id}/variations/${data.id}`,
        summary: `Logged variation "${data.title}" on ${resolved.project.name} as a draft. Client approval link — copy and send this to get their sign-off before work starts: ${approvalLink}`,
      };
    },
  },
  {
    name: "create_milestone",
    description: "Add a new milestone to an existing project's schedule. Use when the user asks to add, create, or track a milestone.",
    input_schema: {
      type: "object",
      properties: {
        project_name_hint: { type: "string", description: "Which project this is for — a name or a distinctive word/two from it." },
        name: { type: "string", description: "Milestone name, e.g. 'Slab pour complete'." },
        target_date: { type: "string", description: "Target date as YYYY-MM-DD, if mentioned." },
      },
      required: ["project_name_hint", "name"],
    },
    run: async (supabase, input, ctx) => {
      const resolved = await resolveProject(supabase, ctx.companyId, String(input.project_name_hint));
      if ("error" in resolved) return resolved;
      const { data, error } = await supabase
        .from("milestones")
        .insert({ project_id: resolved.project.id, name: String(input.name), target_date: (input.target_date as string) || null, status: "pending" })
        .select("id, name")
        .single();
      if (error || !data) return { error: error?.message ?? "Couldn't create the milestone." };
      return { label: `Milestone: ${data.name}`, href: `/projects/${resolved.project.id}/milestones`, summary: `Added milestone "${data.name}" to ${resolved.project.name}.` };
    },
  },
  {
    name: "create_direction_to_rectify",
    description: "Log a QBCC Direction to Rectify on an existing project. Use when the user asks to log or record a direction to rectify, or a QBCC notice to fix defective work.",
    input_schema: {
      type: "object",
      properties: {
        project_name_hint: { type: "string", description: "Which project this is for — a name or a distinctive word/two from it." },
        description: { type: "string", description: "What defective or incomplete work the direction covers." },
        due_date: { type: "string", description: "Due date as YYYY-MM-DD. Defaults to 35 days out if not mentioned." },
      },
      required: ["project_name_hint", "description"],
    },
    run: async (supabase, input, ctx) => {
      const resolved = await resolveProject(supabase, ctx.companyId, String(input.project_name_hint));
      if ("error" in resolved) return resolved;
      const { data, error } = await supabase
        .from("directions_to_rectify")
        .insert({
          project_id: resolved.project.id,
          description: String(input.description),
          due_date: (input.due_date as string) || addDays(35),
          created_by: ctx.userId,
          status: "open",
        })
        .select("id, description")
        .single();
      if (error || !data) return { error: error?.message ?? "Couldn't create the direction to rectify." };
      return { label: "Direction to Rectify", href: `/projects/${resolved.project.id}/directions-to-rectify/${data.id}`, summary: `Logged a new Direction to Rectify on ${resolved.project.name}.` };
    },
  },
  {
    name: "create_payment_claim",
    description: "Log a new payment/progress claim on an existing project. Use when the user asks to log, record, or submit a payment claim.",
    input_schema: {
      type: "object",
      properties: {
        project_name_hint: { type: "string", description: "Which project this is for — a name or a distinctive word/two from it." },
        amount_claimed: { type: "number", description: "The amount being claimed, in AUD." },
        claim_number: { type: "string", description: "Claim number/reference, if mentioned." },
        due_date: { type: "string", description: "Payment due date as YYYY-MM-DD. Defaults to 15 business days out if not mentioned." },
      },
      required: ["project_name_hint", "amount_claimed"],
    },
    run: async (supabase, input, ctx) => {
      const resolved = await resolveProject(supabase, ctx.companyId, String(input.project_name_hint));
      if ("error" in resolved) return resolved;
      const dueDate = (input.due_date as string) || addBusinessDays(15);
      const { data, error } = await supabase
        .from("payment_claims")
        .insert({
          project_id: resolved.project.id,
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
      return { label: "Payment Claim", href: `/projects/${resolved.project.id}/payment-claims/${data.id}`, summary: `Logged a payment claim for $${Number(input.amount_claimed).toLocaleString()} on ${resolved.project.name}.` };
    },
  },
  {
    name: "create_subcontractor",
    description: "Add a subcontractor to an existing project's register. Use when the user asks to add, register, or record a subcontractor.",
    input_schema: {
      type: "object",
      properties: {
        project_name_hint: { type: "string", description: "Which project this is for — a name or a distinctive word/two from it." },
        company_name: { type: "string", description: "Subcontractor's company name." },
        trade: { type: "string", description: "Trade, e.g. Electrical, Plumbing." },
        contact_name: { type: "string", description: "Contact person's name, if mentioned." },
        contact_phone: { type: "string", description: "Contact phone number, if mentioned." },
        contact_email: { type: "string", description: "Contact email, if mentioned." },
      },
      required: ["project_name_hint", "company_name"],
    },
    run: async (supabase, input, ctx) => {
      const resolved = await resolveProject(supabase, ctx.companyId, String(input.project_name_hint));
      if ("error" in resolved) return resolved;
      const { data, error } = await supabase
        .from("subcontractors")
        .insert({
          project_id: resolved.project.id,
          company_name: String(input.company_name),
          trade: (input.trade as string) || null,
          contact_name: (input.contact_name as string) || null,
          contact_phone: (input.contact_phone as string) || null,
          contact_email: (input.contact_email as string) || null,
        })
        .select("id, company_name")
        .single();
      if (error || !data) return { error: error?.message ?? "Couldn't add the subcontractor." };
      return { label: data.company_name, href: `/projects/${resolved.project.id}/subcontractors/${data.id}`, summary: `Added ${data.company_name} to ${resolved.project.name}'s subcontractor register.` };
    },
  },
  {
    name: "create_inspection",
    description: "Schedule a new quality inspection (ITP hold point, witness point, or final inspection) on an existing project.",
    input_schema: {
      type: "object",
      properties: {
        project_name_hint: { type: "string", description: "Which project this is for — a name or a distinctive word/two from it." },
        work_area: { type: "string", description: "Work area or trade being inspected." },
        inspection_type: { type: "string", enum: ["hold_point", "witness_point", "final"], description: "Type of inspection. Default to hold_point if unclear." },
        scheduled_date: { type: "string", description: "Scheduled date as YYYY-MM-DD, if mentioned." },
      },
      required: ["project_name_hint", "work_area"],
    },
    run: async (supabase, input, ctx) => {
      const resolved = await resolveProject(supabase, ctx.companyId, String(input.project_name_hint));
      if ("error" in resolved) return resolved;
      const { data, error } = await supabase
        .from("inspections")
        .insert({
          project_id: resolved.project.id,
          work_area: String(input.work_area),
          inspection_type: (input.inspection_type as InspectionType) || "hold_point",
          scheduled_date: (input.scheduled_date as string) || null,
          created_by: ctx.userId,
          status: "pending",
        })
        .select("id, work_area")
        .single();
      if (error || !data) return { error: error?.message ?? "Couldn't create the inspection." };
      return { label: `Inspection: ${data.work_area}`, href: `/projects/${resolved.project.id}/inspections/${data.id}`, summary: `Scheduled an inspection for "${data.work_area}" on ${resolved.project.name}.` };
    },
  },
  {
    name: "create_ncr",
    description: "Raise a non-conformance report (NCR) on an existing project. Use when the user asks to raise, log, or record an NCR or non-conforming work.",
    input_schema: {
      type: "object",
      properties: {
        project_name_hint: { type: "string", description: "Which project this is for — a name or a distinctive word/two from it." },
        description: { type: "string", description: "What doesn't conform to spec/drawings/standards." },
        trade: { type: "string", description: "Trade responsible, if mentioned." },
      },
      required: ["project_name_hint", "description"],
    },
    run: async (supabase, input, ctx) => {
      const resolved = await resolveProject(supabase, ctx.companyId, String(input.project_name_hint));
      if ("error" in resolved) return resolved;
      const { data, error } = await supabase
        .from("non_conformance_reports")
        .insert({ project_id: resolved.project.id, description: String(input.description), trade: (input.trade as string) || null, created_by: ctx.userId, status: "open" })
        .select("id, description")
        .single();
      if (error || !data) return { error: error?.message ?? "Couldn't create the NCR." };
      return { label: "NCR", href: `/projects/${resolved.project.id}/ncrs/${data.id}`, summary: `Raised a new non-conformance report on ${resolved.project.name}.` };
    },
  },
  {
    name: "create_lead",
    description: "Log a new sales lead or enquiry for a potential job — not tied to an existing project. Use when the user mentions a new customer enquiry, someone asking for a quote, or a new job opportunity, even in passing.",
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
      return { label: data.client_name, href: "/leads", summary: `Added ${data.client_name} as a new lead.` };
    },
  },
  {
    name: "create_material_order",
    description: "Log a materials order or delivery for an existing project — what's been ordered/received, from whom, and when. Use when the user mentions ordering, needing, or receiving materials/supplies for a project.",
    input_schema: {
      type: "object",
      properties: {
        project_name_hint: { type: "string", description: "Which project this is for — a name or a distinctive word/two from it." },
        description: { type: "string", description: "What was ordered/received, e.g. '12x roof trusses'." },
        supplier: { type: "string", description: "Supplier name, if mentioned." },
        quantity_ordered: { type: "number", description: "Quantity, if mentioned." },
        unit: { type: "string", description: "Unit, e.g. m3, bags, each, if mentioned." },
        cost: { type: "number", description: "Cost in AUD, if mentioned." },
        expected_date: { type: "string", description: "Expected delivery date as YYYY-MM-DD, if mentioned." },
      },
      required: ["project_name_hint", "description"],
    },
    run: async (supabase, input, ctx) => {
      const resolved = await resolveProject(supabase, ctx.companyId, String(input.project_name_hint));
      if ("error" in resolved) return resolved;
      const { data, error } = await supabase
        .from("materials")
        .insert({
          project_id: resolved.project.id,
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
      return { label: data.description, href: `/projects/${resolved.project.id}/materials`, summary: `Logged on ${resolved.project.name}: "${data.description}".` };
    },
  },
  {
    name: "log_worker_hours",
    description: "Log hours a named worker worked on an existing project on a given day. If the worker isn't already on the company's worker list, one is created automatically. Use when the user mentions hours someone worked.",
    input_schema: {
      type: "object",
      properties: {
        project_name_hint: { type: "string", description: "Which project this is for — a name or a distinctive word/two from it." },
        worker_name: { type: "string", description: "The worker's name." },
        hours: { type: "number", description: "Hours worked." },
        work_date: { type: "string", description: "Date worked as YYYY-MM-DD. Defaults to today if not mentioned." },
        notes: { type: "string", description: "Any notes, if mentioned." },
      },
      required: ["project_name_hint", "worker_name", "hours"],
    },
    run: async (supabase, input, ctx) => {
      const resolved = await resolveProject(supabase, ctx.companyId, String(input.project_name_hint));
      if ("error" in resolved) return resolved;
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
        project_id: resolved.project.id,
        hours: Number(input.hours),
        work_date: (input.work_date as string) || toDateInput(new Date()),
        notes: (input.notes as string) || null,
        created_by: ctx.userId,
      });
      if (error) return { error: error.message };
      return { label: `${workerName} — ${input.hours}h`, href: `/projects/${resolved.project.id}/worker-hours`, summary: `Logged ${input.hours}h for ${workerName} on ${resolved.project.name}.` };
    },
  },
];

export async function POST(request: Request) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: "ANTHROPIC_API_KEY is not configured on the server." }, { status: 400 });
  }

  const { question, history } = (await request.json()) as { question?: string; history?: ChatMessage[] };
  if (!question?.trim()) {
    return NextResponse.json({ error: "Ask a question first." }, { status: 400 });
  }

  // Needed to build full, shareable /vary/<token> client approval links —
  // the tool runs server-side, so there's no window.location to read.
  const origin = new URL(request.url).origin;

  const supabase = await createClient();

  const { allowed } = await checkRateLimit(supabase, RATE_LIMITS.dashboardAsk);
  if (!allowed) return rateLimitResponse();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: callerProfile } = user
    ? await supabase.from("profiles").select("company_id").eq("id", user.id).single()
    : { data: null };
  const companyId = callerProfile?.company_id ?? null;

  if (!companyId) {
    return NextResponse.json({ error: "Your account isn't linked to a company yet." }, { status: 400 });
  }

  const { data: projects } = await supabase
    .from("projects")
    .select("id, name, status")
    .eq("company_id", companyId)
    .order("created_at", { ascending: false })
    .limit(50);

  const complianceAlerts = await getComplianceAlerts(supabase, companyId);

  const contextParts: string[] = [`Today's date: ${toDateInput(new Date())}`];

  contextParts.push(
    projects?.length
      ? "Your company's projects:\n" + projects.map((p) => `- ${p.name} (${p.status})`).join("\n")
      : "Your company has no projects yet."
  );

  contextParts.push(
    complianceAlerts.length
      ? "Compliance status across all projects (computed from real data — Directions to Rectify, BIF Act supporting statements, licence/MFR expiry, deposit cap, retention):\n" +
          complianceAlerts.map((a) => `- [${a.severity === "red" ? "action needed" : "watch"}] ${a.message}`).join("\n")
      : "Compliance status: no compliance risks currently detected across your projects."
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
      "You are Ask CivFlow, an assistant embedded in a construction site management app, running here on the company dashboard (not scoped to any single project).",
      "You can do two things: answer quick questions using the company overview below, and take action by calling a tool to create a record — including creating a brand-new project, or logging something (an RFI, variation, milestone, direction to rectify, payment claim, subcontractor, inspection, NCR, sales lead, material order/delivery, or worker hours) against one of the existing projects listed below.",
      "Every tool except create_project and create_lead needs a project_name_hint — pull this from what the user said (e.g. 'the Chen job', 'Wattlebird St') and pass it through as given. You don't need to match it exactly against the project list yourself; the tool resolves it and will tell you if it can't find a match or finds more than one, so you can ask the user to clarify.",
      "Creating a variation always returns a client approval link in the result — surface it plainly so the user can copy it.",
      "When the user asks you to create/raise/log/add/schedule something that matches one of your tools, call that tool. Fill in fields from what the user told you (and this conversation's history) — don't invent specifics they didn't give you (like a cost figure or a name) unless it was actually mentioned.",
      "If a required field is missing (e.g. no question text for an RFI, no company name for a subcontractor), don't call the tool — ask a short clarifying question in plain text instead.",
      "If the user asks something like 'am I compliant' or 'any issues right now', answer directly from the Compliance status block below — name the specific issues (or confirm there are none). Always add that this is a tracking aid, not a substitute for checking directly with the QBCC.",
      "Only call one tool per message, for the single most recent request.",
      "",
      contextParts.join("\n\n"),
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
    const result = await tool.run(supabase, toolUse.input as Record<string, unknown>, { userId: user?.id ?? null, companyId, origin });
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
