import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import NewProjectForm from "./new-project-form";
import { AskDashboardChat } from "./ask-dashboard-chat";
import { DocumentAiUpload } from "./document-ai-upload";
import { AddReminderForm } from "@/components/reminders/add-reminder-form";
import { ReminderRow } from "@/components/reminders/reminder-row";
import { StatCard } from "@/components/ui/stat-card";
import { EmptyProjectsIllustration } from "@/components/ui/empty-projects-illustration";
import { ExpandableGrid } from "@/components/ui/expandable-grid";
import { Card } from "@/components/ui/card";
import { Badge, BadgeTone } from "@/components/ui/badge";
import { getComplianceAlerts } from "@/lib/compliance";
import { WorkerQuestionsWidget } from "./worker-questions-widget";

const statusTone: Record<string, BadgeTone> = {
  draft: "neutral",
  in_review: "amber",
  approved: "emerald",
};

function startOfWeek(date: Date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = (day === 0 ? -6 : 1) - day; // Monday as start of week
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

const CalendarIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="18" rx="2" />
    <path d="M16 2v4M8 2v4M3 10h18" />
  </svg>
);
const ClockIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5l3 3" />
  </svg>
);
const AlertIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 9v4M12 17h.01" />
    <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" />
  </svg>
);
const FileIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <path d="M14 2v6h6M9 13h6M9 17h6" />
  </svg>
);
const ShieldIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 2 4 5v6c0 5 3.4 9.4 8 11 4.6-1.6 8-6 8-11V5l-8-3Z" />
  </svg>
);

function formatCurrency(n: number) {
  return n.toLocaleString(undefined, { style: "currency", currency: "AUD", maximumFractionDigits: 0 });
}

function addDays(dateStr: string, days: number) {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function daysUntil(dateStr: string | null): number | null {
  if (!dateStr) return null;
  const diff = new Date(dateStr).getTime() - new Date().setHours(0, 0, 0, 0);
  return Math.round(diff / (1000 * 60 * 60 * 24));
}

function ExpiryBadge({ label, dateStr }: { label: string; dateStr: string | null }) {
  const days = daysUntil(dateStr);
  if (days === null) return <Badge>{label}: not set</Badge>;
  if (days < 0) return <Badge tone="red">{label}: overdue by {Math.abs(days)}d</Badge>;
  if (days <= 60) return <Badge tone="amber">{label}: due in {days}d</Badge>;
  return <Badge tone="emerald">{label}: {days}d away</Badge>;
}

export default async function DashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [
    { data: profile },
    { data: projects },
    { data: entries },
    { count: openRfis },
    { count: pendingVariations },
    { count: openDtrCount },
    { count: awaitingPaymentClaims },
    { count: openNcrCount },
    { count: flaggedMaterialsCount },
    { count: overdueEquipmentCount },
    { count: openLeadsCount },
    { data: reminders },
    { data: variations },
    { data: paymentClaims },
    { data: subPayments },
    { data: myRfis },
    { data: myDtrs },
    { data: myNcrs },
    { data: unansweredWorkerQuestions },
  ] = await Promise.all([
    supabase.from("profiles").select("full_name, company_id").eq("id", user!.id).single(),
    supabase
      .from("projects")
      .select("id, name, site_address, status, defects_liability_end_date, contract_value, contracted_completion_date, practical_completion_date")
      .order("created_at", { ascending: false }),
    supabase
      .from("diary_entries")
      .select("id, project_id, entry_date, status, created_at")
      .order("created_at", { ascending: false }),
    supabase.from("rfis").select("id", { count: "exact", head: true }).eq("status", "open"),
    supabase.from("variations").select("id", { count: "exact", head: true }).in("status", ["draft", "submitted"]),
    supabase.from("directions_to_rectify").select("id", { count: "exact", head: true }).in("status", ["open", "disputed"]),
    supabase.from("payment_claims").select("id", { count: "exact", head: true }).in("status", ["submitted", "schedule_received"]),
    supabase.from("non_conformance_reports").select("id", { count: "exact", head: true }).eq("status", "open"),
    supabase.from("materials").select("id", { count: "exact", head: true }).in("status", ["short", "damaged"]),
    supabase
      .from("asset_checkouts")
      .select("id", { count: "exact", head: true })
      .is("returned_date", null)
      .lt("due_back_date", new Date().toISOString().slice(0, 10)),
    supabase.from("leads").select("id", { count: "exact", head: true }).not("status", "in", "(won,lost)"),
    supabase
      .from("reminders")
      .select("id, title, due_date, project_id")
      .eq("completed", false)
      .order("due_date", { ascending: true })
      .limit(5),
    supabase.from("variations").select("project_id, cost_impact, time_impact_days").eq("status", "approved"),
    supabase.from("payment_claims").select("amount_claimed, paid_amount"),
    supabase.from("subcontractor_payments").select("retention_held"),
    supabase
      .from("rfis")
      .select("id, project_id, subject, due_date")
      .eq("assigned_to", user!.id)
      .eq("status", "open"),
    supabase
      .from("directions_to_rectify")
      .select("id, project_id, description, due_date")
      .eq("assigned_to", user!.id)
      .in("status", ["open", "disputed"]),
    supabase
      .from("non_conformance_reports")
      .select("id, project_id, description")
      .eq("assigned_to", user!.id)
      .eq("status", "open"),
    supabase
      .from("worker_questions")
      .select("id, project_id, question, created_at, asked_by")
      .is("answer", null)
      .order("created_at", { ascending: false })
      .limit(20),
  ]);

  const { data: company } = profile?.company_id
    ? await supabase
        .from("companies")
        .select("qbcc_licence_expiry, mfr_report_due_date, company_type")
        .eq("id", profile.company_id)
        .single()
    : { data: null };
  const isResidential = company?.company_type === "residential_builder";
  const complianceAlerts = await getComplianceAlerts(supabase, profile?.company_id ?? null);
  const complianceAlertsSorted = [...complianceAlerts].sort((a, b) => (a.severity === b.severity ? 0 : a.severity === "red" ? -1 : 1));

  const entryIds = (entries ?? []).map((e) => e.id);
  const { count: safetyFlags } = entryIds.length
    ? await supabase
        .from("safety_observations")
        .select("id", { count: "exact", head: true })
        .in("diary_entry_id", entryIds)
        .in("severity", ["major", "incident"])
    : { count: 0 };

  const today = new Date().toISOString().slice(0, 10);
  const weekStart = startOfWeek(new Date()).toISOString().slice(0, 10);

  const allEntries = entries ?? [];
  const entriesThisWeek = allEntries.filter((e) => e.entry_date >= weekStart).length;
  const entriesInReview = allEntries.filter((e) => e.status === "in_review").length;

  const lastEntryByProject = new Map<string, { date: string; status: string }>();
  for (const e of allEntries) {
    const existing = lastEntryByProject.get(e.project_id);
    if (!existing || e.entry_date > existing.date) {
      lastEntryByProject.set(e.project_id, { date: e.entry_date, status: e.status });
    }
  }

  const activeProjects = (projects ?? []).filter((p) => p.status === "active");
  const needsAttention = activeProjects.filter((p) => lastEntryByProject.get(p.id)?.date !== today);

  const approvedVariationsByProject = new Map<string, { cost: number; days: number }>();
  for (const v of variations ?? []) {
    const existing = approvedVariationsByProject.get(v.project_id) ?? { cost: 0, days: 0 };
    existing.cost += v.cost_impact ?? 0;
    existing.days += v.time_impact_days ?? 0;
    approvedVariationsByProject.set(v.project_id, existing);
  }

  const totalOriginalContractValue = (projects ?? []).reduce((sum, p) => sum + (p.contract_value ?? 0), 0);
  const totalApprovedVariationsCost = [...approvedVariationsByProject.values()].reduce((sum, v) => sum + v.cost, 0);
  const totalRevisedContractValue = totalOriginalContractValue + totalApprovedVariationsCost;
  const totalClaimed = (paymentClaims ?? []).reduce((sum, c) => sum + c.amount_claimed, 0);
  const totalPaidByClient = (paymentClaims ?? []).reduce((sum, c) => sum + (c.paid_amount ?? 0), 0);
  const totalOutstandingClaims = Math.max(0, totalClaimed - totalPaidByClient);
  const totalRetentionHeld = (subPayments ?? []).reduce((sum, p) => sum + p.retention_held, 0);

  const projectsBehindSchedule = (projects ?? []).filter((p) => {
    if (p.status !== "active" || p.practical_completion_date || !p.contracted_completion_date) return false;
    const approvedDays = approvedVariationsByProject.get(p.id)?.days ?? 0;
    const forecast = addDays(p.contracted_completion_date, approvedDays);
    return forecast < today;
  });

  const dlpEndingSoon = (projects ?? []).filter((p) => {
    const days = daysUntil(p.defects_liability_end_date);
    return days !== null && days >= 0 && days <= 30;
  });

  // One unified, severity-sorted list of everything flagged across every
  // project — compliance risks, schedule slippage, defects liability
  // windows closing, and missing today's entry — instead of four separate
  // colour-coded boxes stacked on top of each other saying variations of
  // "something needs attention."
  const projectHealthAlerts = [
    ...complianceAlertsSorted,
    ...projectsBehindSchedule.map((p) => ({
      severity: "red" as const,
      message: `${p.name} is forecast past its contracted completion date — review schedule`,
      href: `/projects/${p.id}/financials`,
    })),
    ...dlpEndingSoon.map((p) => ({
      severity: "amber" as const,
      message: `${p.name}'s defects liability period ends within 30 days — review defects`,
      href: `/projects/${p.id}/practical-completion`,
    })),
    ...needsAttention.map((p) => ({
      severity: "amber" as const,
      message: `${p.name} hasn't had a diary entry logged today — log one now`,
      href: `/projects/${p.id}/new-entry`,
    })),
  ].sort((a, b) => (a.severity === b.severity ? 0 : a.severity === "red" ? -1 : 1));

  const recentActivity = allEntries.slice(0, 6).map((e) => ({
    ...e,
    projectName: projects?.find((p) => p.id === e.project_id)?.name ?? "Unknown project",
  }));

  const projectName = (id: string) => projects?.find((p) => p.id === id)?.name ?? "Unknown project";
  const myOpenItems = [
    ...(myRfis ?? []).map((r) => ({
      id: r.id,
      kind: "RFI" as const,
      label: r.subject,
      dueDate: r.due_date as string | null,
      href: `/projects/${r.project_id}/rfis/${r.id}`,
      projectName: projectName(r.project_id),
    })),
    ...(myDtrs ?? []).map((d) => ({
      id: d.id,
      kind: "DTR" as const,
      label: d.description,
      dueDate: d.due_date as string | null,
      href: `/projects/${d.project_id}/directions-to-rectify/${d.id}`,
      projectName: projectName(d.project_id),
    })),
    ...(myNcrs ?? []).map((n) => ({
      id: n.id,
      kind: "NCR" as const,
      label: n.description,
      dueDate: null as string | null,
      href: `/projects/${n.project_id}/ncrs/${n.id}`,
      projectName: projectName(n.project_id),
    })),
  ].sort((a, b) => (a.dueDate ?? "9999").localeCompare(b.dueDate ?? "9999"));

  const askerIds = [...new Set((unansweredWorkerQuestions ?? []).map((q) => q.asked_by))];
  const { data: askerProfiles } = askerIds.length
    ? await supabase.from("profiles").select("id, full_name").in("id", askerIds)
    : { data: [] as { id: string; full_name: string | null }[] };
  const workerQuestions = (unansweredWorkerQuestions ?? []).map((q) => ({
    id: q.id,
    projectId: q.project_id,
    projectName: projectName(q.project_id),
    question: q.question,
    askerName: askerProfiles?.find((p) => p.id === q.asked_by)?.full_name ?? "A crew member",
    createdAt: q.created_at,
  }));

  return (
    <div className="animate-fade-in">
      <h1 className="text-3xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">
        {profile?.full_name ? `Welcome back, ${profile.full_name.split(" ")[0]}` : "Dashboard"}
      </h1>
      <p className="mt-1.5 text-sm text-slate-500 dark:text-slate-400">Here&apos;s what&apos;s happening across your projects.</p>

      <div className="mt-6 space-y-3">
        <AskDashboardChat />
        <DocumentAiUpload projects={(projects ?? []).filter((p) => p.status === "active").map((p) => ({ id: p.id, name: p.name }))} />
      </div>

      {/* Overview — operational stats and the financial roll-up together in
          one panel, since they're both "the numbers at a glance," rather
          than two separate boxes making the same kind of claim on
          attention. */}
      <section className="mt-10">
        <h2 className="text-lg font-semibold tracking-tight text-slate-900 dark:text-slate-100">Overview</h2>
        <Card className="mt-3 p-6">
          {/* Six most useful at a glance up front — orientation (active
              projects), the two most universally actionable warnings
              (today's entry, safety), and money. Everything else is a real
              number that matters sometimes, not all the time, so it's one
              click away instead of competing for attention by default. */}
          <ExpandableGrid visibleCount={6} gridClassName="grid grid-cols-2 gap-x-6 gap-y-5 sm:grid-cols-4">
            <StatCard label="Active projects" value={activeProjects.length} icon={<CalendarIcon />} />
            <StatCard label="Need today's entry" value={needsAttention.length} icon={<AlertIcon />} tone="warning" />
            <StatCard label="Safety flags" value={safetyFlags ?? 0} icon={<ShieldIcon />} tone="danger" />
            <StatCard label="Payment claims awaiting" value={awaitingPaymentClaims ?? 0} icon={<FileIcon />} tone="warning" />
            <StatCard label="Entries this week" value={entriesThisWeek} icon={<FileIcon />} />
            <StatCard label="Awaiting review" value={entriesInReview} icon={<ClockIcon />} tone="warning" />
            <StatCard label="Open RFIs" value={openRfis ?? 0} icon={<FileIcon />} />
            <StatCard label="Pending variations" value={pendingVariations ?? 0} icon={<FileIcon />} />
            {!isResidential && <StatCard label="Open Directions to Rectify" value={openDtrCount ?? 0} icon={<AlertIcon />} tone="danger" />}
            {!isResidential && <StatCard label="Open NCRs" value={openNcrCount ?? 0} icon={<AlertIcon />} tone="danger" />}
            <StatCard label="Deliveries flagged" value={flaggedMaterialsCount ?? 0} icon={<AlertIcon />} tone="danger" />
            <StatCard label="Equipment overdue" value={overdueEquipmentCount ?? 0} icon={<AlertIcon />} tone="danger" />
            <StatCard label="Open leads" value={openLeadsCount ?? 0} icon={<FileIcon />} />
          </ExpandableGrid>

          {totalOriginalContractValue > 0 && (
            <div className="mt-6 border-t border-slate-100 pt-6 dark:border-slate-800/80">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                Financials — across active projects
              </h3>
              <div className="mt-3 grid grid-cols-2 gap-x-6 gap-y-5 sm:grid-cols-4">
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Revised contract value</p>
                  <p className="mt-1.5 text-2xl font-semibold text-slate-900 dark:text-slate-100">{formatCurrency(totalRevisedContractValue)}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Claimed to date</p>
                  <p className="mt-1.5 text-2xl font-semibold text-slate-900 dark:text-slate-100">{formatCurrency(totalClaimed)}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Outstanding claims</p>
                  <p className="mt-1.5 text-2xl font-semibold text-slate-900 dark:text-slate-100">{formatCurrency(totalOutstandingClaims)}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Sub retention held</p>
                  <p className="mt-1.5 text-2xl font-semibold text-slate-900 dark:text-slate-100">{formatCurrency(totalRetentionHeld)}</p>
                </div>
              </div>
            </div>
          )}
        </Card>
      </section>

      {/* Needs attention — everything personally assigned to you or waiting
          on a reply, in one place instead of two separate boxes. */}
      {(myOpenItems.length > 0 || workerQuestions.length > 0) && (
        <section className="mt-10">
          <h2 className="text-lg font-semibold tracking-tight text-slate-900 dark:text-slate-100">Needs attention</h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Assigned to you, or waiting on a reply.</p>
          <Card className="mt-3 divide-y divide-slate-100 p-6 dark:divide-slate-800/80">
            {myOpenItems.length > 0 && (
              <div className={workerQuestions.length > 0 ? "pb-6" : ""}>
                <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">My open items</h3>
                <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">RFIs, Directions to Rectify, and NCRs assigned to you</p>
                <ul className="mt-3 space-y-1.5">
                  {myOpenItems.map((item) => (
                    <li key={`${item.kind}-${item.id}`} className="flex items-center justify-between gap-3 text-sm">
                      <Link href={item.href} className="min-w-0 truncate text-slate-900 hover:underline dark:text-slate-100">
                        <Badge tone="neutral" className="mr-2 align-middle">{item.kind}</Badge>
                        {item.label} <span className="text-slate-500 dark:text-slate-400">— {item.projectName}</span>
                      </Link>
                      {item.dueDate && (
                        <span className="shrink-0 text-xs text-slate-500 dark:text-slate-400">Due {item.dueDate}</span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {workerQuestions.length > 0 && (
              <div className={myOpenItems.length > 0 ? "pt-6" : ""}>
                <WorkerQuestionsWidget questions={workerQuestions} />
              </div>
            )}
          </Card>
        </section>
      )}

      {/* Project health — compliance risk, schedule slippage, defects
          liability windows, and missing entries, unified into one
          severity-sorted list instead of four separately-coloured boxes all
          competing to look the most urgent. */}
      {company && (
        <section className="mt-10">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold tracking-tight text-slate-900 dark:text-slate-100">Project health</h2>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Compliance, schedule, and outstanding site diary entries.</p>
            </div>
            <Link href="/compliance" className="text-xs font-medium text-brand-orange hover:underline">
              View full compliance details
            </Link>
          </div>
          <Card className="mt-3 p-6">
            <div className="flex flex-wrap gap-2">
              <ExpiryBadge label="Licence expiry" dateStr={company.qbcc_licence_expiry} />
              <ExpiryBadge label="MFR report due" dateStr={company.mfr_report_due_date} />
            </div>

            {projectHealthAlerts.length > 0 ? (
              <ul className="mt-4 space-y-2.5">
                {projectHealthAlerts.slice(0, 6).map((alert, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-sm">
                    <Badge tone={alert.severity === "red" ? "red" : "amber"} className="mt-0.5 shrink-0">
                      {alert.severity === "red" ? "action needed" : "watch"}
                    </Badge>
                    <Link href={alert.href} className="text-slate-700 hover:underline dark:text-slate-300">
                      {alert.message}
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-4 text-sm text-emerald-700 dark:text-emerald-400">
                Nothing flagged across your active projects right now.
              </p>
            )}
            {projectHealthAlerts.length > 6 && (
              <p className="mt-2.5 text-xs text-slate-500 dark:text-slate-400">
                +{projectHealthAlerts.length - 6} more — <Link href="/compliance" className="text-brand-orange hover:underline">view all</Link>
              </p>
            )}
          </Card>
        </section>
      )}

      {/* Reminders + recent activity — both chronological lists, so they sit
          side by side on wider screens instead of stacking two full-width
          boxes. */}
      <section className="mt-10 grid gap-6 lg:grid-cols-2">
        <div>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-semibold tracking-tight text-slate-900 dark:text-slate-100">Reminders</h2>
            <Link href="/calendar" className="text-xs font-medium text-brand-orange hover:underline">
              View calendar
            </Link>
          </div>
          <Card className="mt-3 p-0">
            {reminders && reminders.length > 0 && (
              <div className="divide-y divide-slate-100 dark:divide-slate-800/80">
                {reminders.map((r) => (
                  <ReminderRow
                    key={r.id}
                    id={r.id}
                    title={r.title}
                    dueDate={r.due_date}
                    projectName={r.project_id ? projects?.find((p) => p.id === r.project_id)?.name : undefined}
                  />
                ))}
              </div>
            )}
            <div className="p-5">
              <AddReminderForm projects={projects ?? []} compact />
            </div>
          </Card>
        </div>

        <div>
          <h2 className="text-lg font-semibold tracking-tight text-slate-900 dark:text-slate-100">Recent activity</h2>
          {recentActivity.length > 0 ? (
            <Card className="mt-3 divide-y divide-slate-100 overflow-hidden p-0 dark:divide-slate-800/80">
              {recentActivity.map((e) => (
                <Link
                  key={e.id}
                  href={`/projects/${e.project_id}/entries/${e.id}`}
                  className="flex items-center justify-between px-4 py-3 text-sm transition-colors hover:bg-surface-hover"
                >
                  <span className="text-slate-900 dark:text-slate-100">
                    {e.projectName} <span className="text-slate-500 dark:text-slate-400">— {e.entry_date}</span>
                  </span>
                  <Badge tone={statusTone[e.status]}>{e.status.replace("_", " ")}</Badge>
                </Link>
              ))}
            </Card>
          ) : (
            <Card className="mt-3 p-5">
              <p className="text-sm text-slate-500 dark:text-slate-400">No site diary activity logged yet.</p>
            </Card>
          )}
        </div>
      </section>

      {/* Projects */}
      <section className="mt-10">
        <h2 className="text-lg font-semibold tracking-tight text-slate-900 dark:text-slate-100">Projects</h2>
        <div className="mt-3 grid gap-4 sm:grid-cols-2">
          {projects?.map((project) => {
            const last = lastEntryByProject.get(project.id);
            return (
              <Link key={project.id} href={`/projects/${project.id}`}>
                <Card interactive className="p-5">
                  <div className="flex items-start justify-between">
                    <p className="font-medium text-slate-900 dark:text-slate-100">{project.name}</p>
                    <Badge tone={project.status === "active" ? "emerald" : "neutral"}>{project.status}</Badge>
                  </div>
                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{project.site_address ?? "No site address set"}</p>
                  <p className="mt-4 text-xs text-slate-400 dark:text-slate-500">
                    {last ? `Last entry ${last.date}` : "No entries yet"}
                  </p>
                </Card>
              </Link>
            );
          })}

          {!projects?.length && (
            <Card className="p-8 text-center sm:col-span-2">
              <EmptyProjectsIllustration className="mx-auto h-24 w-auto" />
              <p className="mt-4 text-sm font-medium text-slate-700 dark:text-slate-300">No projects yet</p>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Create your first one below to get started.</p>
            </Card>
          )}
        </div>
      </section>

      <Card className="mt-10 max-w-sm p-6">
        <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">New project</h2>
        <div className="mt-3">
          <NewProjectForm />
        </div>
      </Card>
    </div>
  );
}
