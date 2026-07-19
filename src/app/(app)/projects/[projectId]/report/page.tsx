import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { BackLink, PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Badge, BadgeTone } from "@/components/ui/badge";
import { PrintHeader } from "@/components/print/print-header";
import { PrintFooter } from "@/components/print/print-footer";
import { PrintButton } from "@/components/print/print-button";
import { DraftUpdate } from "./draft-update";
import { addDaysToDate, daysBetweenDates } from "@/lib/dates";
import { calculatePercentBilled } from "@/lib/financial-calcs";

// A print-to-PDF summary a builder can generate any time a client asks
// "where are we up to?" — same underlying data as the live client portal,
// but a single self-contained document (via the browser's Save as PDF) that
// can be emailed or handed over, rather than a link. Deliberately excludes
// internal cost breakdowns and estimated margin, same scope decision as the
// portal — a client report should read like a statement, not a P&L.

const milestoneStatusTone: Record<string, BadgeTone> = {
  pending: "neutral",
  on_track: "emerald",
  at_risk: "amber",
  delayed: "red",
  complete: "blue",
};

const claimStatusTone: Record<string, BadgeTone> = {
  submitted: "amber",
  schedule_received: "blue",
  paid: "emerald",
  disputed: "red",
};

const variationStatusTone: Record<string, BadgeTone> = {
  draft: "neutral",
  submitted: "amber",
  approved: "emerald",
  rejected: "red",
};

function formatCurrency(n: number | null) {
  if (n === null) return "—";
  return n.toLocaleString(undefined, { style: "currency", currency: "AUD", maximumFractionDigits: 0 });
}

function formatDate(d: string | null | undefined) {
  if (!d) return null;
  return new Date(d).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

export default async function ProjectReportPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  const supabase = await createClient();

  const { data: project } = await supabase
    .from("projects")
    .select(
      "id, name, site_address, status, contract_value, deposit_amount, start_date, contracted_completion_date, practical_completion_date, defects_liability_end_date, company_id"
    )
    .eq("id", projectId)
    .single();
  if (!project) notFound();

  const { data: company } = project.company_id
    ? await supabase.from("companies").select("name, qbcc_licence_number, logo_storage_path").eq("id", project.company_id).single()
    : { data: null };
  const logoUrl = company?.logo_storage_path
    ? supabase.storage.from("company-logos").getPublicUrl(company.logo_storage_path).data.publicUrl
    : null;

  const [
    { data: variations },
    { data: paymentClaims },
    { data: milestones },
    { data: subcontractors },
    { data: entries },
  ] = await Promise.all([
    supabase
      .from("variations")
      .select("id, title, status, cost_impact, time_impact_days, client_approved_at, client_approved_name")
      .eq("project_id", projectId)
      .order("created_at", { ascending: false }),
    supabase
      .from("payment_claims")
      .select("id, claim_number, claim_date, amount_claimed, status, paid_amount, paid_date")
      .eq("project_id", projectId)
      .order("claim_date", { ascending: false }),
    supabase
      .from("milestones")
      .select("id, name, status, target_date, actual_date")
      .eq("project_id", projectId)
      .order("target_date", { ascending: true, nullsFirst: false }),
    supabase.from("subcontractors").select("id, company_name, trade, status").eq("project_id", projectId).order("company_name"),
    supabase
      .from("diary_entries")
      .select("id, entry_date")
      .eq("project_id", projectId)
      .eq("status", "approved")
      .order("entry_date", { ascending: false })
      .limit(10),
  ]);

  const entryIds = (entries ?? []).map((e) => e.id);
  const { data: progressNotes } = entryIds.length
    ? await supabase.from("progress_notes").select("diary_entry_id, summary, percent_complete").in("diary_entry_id", entryIds)
    : { data: [] as { diary_entry_id: string; summary: string | null; percent_complete: number | null }[] };

  const progressHistory = (entries ?? [])
    .map((e) => {
      const note = progressNotes?.find((p) => p.diary_entry_id === e.id);
      return { entry_date: e.entry_date, summary: note?.summary ?? null, percent_complete: note?.percent_complete ?? null };
    })
    .filter((p) => p.summary || p.percent_complete !== null);
  const latestProgress = progressHistory[0] ?? null;

  const approvedVariations = (variations ?? []).filter((v) => v.status === "approved");
  const pendingVariations = (variations ?? []).filter((v) => v.status === "draft" || v.status === "submitted");
  const approvedVariationsCost = approvedVariations.reduce((sum, v) => sum + (v.cost_impact ?? 0), 0);
  const approvedVariationsDays = approvedVariations.reduce((sum, v) => sum + (v.time_impact_days ?? 0), 0);

  const originalContractValue = project.contract_value;
  const revisedContractValue = originalContractValue !== null ? originalContractValue + approvedVariationsCost : null;

  const totalClaimed = (paymentClaims ?? []).reduce((sum, c) => sum + c.amount_claimed, 0);
  const totalPaid = (paymentClaims ?? []).reduce((sum, c) => sum + (c.paid_amount ?? 0), 0);
  const percentBilled = revisedContractValue !== null ? calculatePercentBilled(totalClaimed, revisedContractValue) : null;
  const outstanding = Math.max(0, totalClaimed - totalPaid);

  const forecastCompletion =
    project.practical_completion_date ??
    (project.contracted_completion_date ? addDaysToDate(project.contracted_completion_date, approvedVariationsDays) : null);
  const scheduleVarianceDays =
    project.contracted_completion_date && forecastCompletion ? daysBetweenDates(project.contracted_completion_date, forecastCompletion) : null;
  const isActualCompletion = project.practical_completion_date !== null;

  const allMilestones = milestones ?? [];
  const allSubcontractors = subcontractors ?? [];

  return (
    <div className="mx-auto max-w-2xl animate-fade-in">
      <span className="print:hidden">
        <BackLink href={`/projects/${projectId}`}>Back to project</BackLink>
      </span>

      <div className="mt-3 print:hidden">
        <PageHeader
          title={`Client Report — ${project.name}`}
          subtitle="A shareable snapshot for the client: progress, schedule, and billing status. Print or Save as PDF to send it."
        />
      </div>

      <PrintHeader
        documentTitle="Project Report"
        companyName={company?.name}
        licenceNumber={company?.qbcc_licence_number}
        projectName={project.name}
        siteAddress={project.site_address}
        logoUrl={logoUrl}
      />

      {latestProgress && (
        <Card className="mt-6 p-5 print:mt-0">
          <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Current status</h2>
          {latestProgress.summary && <p className="mt-2 text-sm text-slate-900 dark:text-slate-100">{latestProgress.summary}</p>}
          {latestProgress.percent_complete !== null && (
            <div className="mt-3">
              <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                <div
                  className="h-full rounded-full bg-brand-orange"
                  style={{ width: `${Math.min(100, Math.max(0, latestProgress.percent_complete))}%` }}
                />
              </div>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                {latestProgress.percent_complete}% complete (estimated) as of {formatDate(latestProgress.entry_date)}
              </p>
            </div>
          )}
        </Card>
      )}

      <DraftUpdate projectId={projectId} />

      <Card className="mt-4 p-5">
        <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Contract &amp; billing summary</h2>
        <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-3 text-sm sm:grid-cols-3">
          <div>
            <dt className="text-xs text-slate-500 dark:text-slate-400">Contract value</dt>
            <dd className="mt-0.5 font-medium text-slate-900 dark:text-slate-100">{formatCurrency(revisedContractValue ?? originalContractValue)}</dd>
            {approvedVariationsCost !== 0 && (
              <p className="text-xs text-slate-400 dark:text-slate-500">
                {formatCurrency(originalContractValue)} original {approvedVariationsCost > 0 ? "+" : ""}
                {formatCurrency(approvedVariationsCost)} approved variations
              </p>
            )}
          </div>
          <div>
            <dt className="text-xs text-slate-500 dark:text-slate-400">Deposit paid</dt>
            <dd className="mt-0.5 font-medium text-slate-900 dark:text-slate-100">{formatCurrency(project.deposit_amount)}</dd>
          </div>
          <div>
            <dt className="text-xs text-slate-500 dark:text-slate-400">Total claimed</dt>
            <dd className="mt-0.5 font-medium text-slate-900 dark:text-slate-100">{formatCurrency(totalClaimed)}</dd>
          </div>
          <div>
            <dt className="text-xs text-slate-500 dark:text-slate-400">Total paid</dt>
            <dd className="mt-0.5 font-medium text-slate-900 dark:text-slate-100">{formatCurrency(totalPaid)}</dd>
          </div>
          <div>
            <dt className="text-xs text-slate-500 dark:text-slate-400">Outstanding</dt>
            <dd className="mt-0.5 font-medium text-slate-900 dark:text-slate-100">{formatCurrency(outstanding)}</dd>
          </div>
          {percentBilled !== null && (
            <div>
              <dt className="text-xs text-slate-500 dark:text-slate-400">Billed to date</dt>
              <dd className="mt-0.5 font-medium text-slate-900 dark:text-slate-100">{percentBilled}%</dd>
            </div>
          )}
        </dl>
      </Card>

      <Card className="mt-4 p-5">
        <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Schedule</h2>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {project.start_date && <Badge tone="neutral">Started: {formatDate(project.start_date)}</Badge>}
          {project.contracted_completion_date && <Badge tone="blue">Contracted: {formatDate(project.contracted_completion_date)}</Badge>}
          {forecastCompletion && (
            <Badge tone={isActualCompletion ? "emerald" : "neutral"}>
              {isActualCompletion ? "Completed" : "Forecast"}: {formatDate(forecastCompletion)}
            </Badge>
          )}
          {scheduleVarianceDays !== null && (
            <Badge tone={scheduleVarianceDays <= 0 ? "emerald" : scheduleVarianceDays <= 14 ? "amber" : "red"}>
              {scheduleVarianceDays <= 0 ? `${Math.abs(scheduleVarianceDays)}d ahead or on time` : `${scheduleVarianceDays}d behind contracted date`}
            </Badge>
          )}
          {project.defects_liability_end_date && <Badge tone="purple">Defects liability ends: {formatDate(project.defects_liability_end_date)}</Badge>}
        </div>
      </Card>

      {allMilestones.length > 0 && (
        <Card className="mt-4 p-5">
          <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Milestones</h2>
          <ul className="mt-2 divide-y divide-slate-100 dark:divide-slate-800">
            {allMilestones.map((m) => (
              <li key={m.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                <span className="text-slate-900 dark:text-slate-100">
                  {m.name}
                  {m.target_date && <span className="text-slate-500 dark:text-slate-400"> — target {formatDate(m.target_date)}</span>}
                  {m.actual_date && <span className="text-slate-500 dark:text-slate-400"> · actual {formatDate(m.actual_date)}</span>}
                </span>
                <Badge tone={milestoneStatusTone[m.status] ?? "neutral"}>{m.status.replace("_", " ")}</Badge>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {pendingVariations.length > 0 && (
        <Card className="mt-4 p-5">
          <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Variations awaiting approval</h2>
          <ul className="mt-2 divide-y divide-slate-100 dark:divide-slate-800">
            {pendingVariations.map((v) => (
              <li key={v.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                <span className="text-slate-900 dark:text-slate-100">
                  {v.title}
                  {v.cost_impact !== null && <span className="text-slate-500 dark:text-slate-400"> — {formatCurrency(v.cost_impact)}</span>}
                </span>
                <Badge tone={variationStatusTone[v.status] ?? "neutral"}>{v.status}</Badge>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {approvedVariations.length > 0 && (
        <Card className="mt-4 p-5">
          <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Approved variations</h2>
          <ul className="mt-2 divide-y divide-slate-100 dark:divide-slate-800">
            {approvedVariations.map((v) => (
              <li key={v.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                <span className="text-slate-900 dark:text-slate-100">
                  {v.title}
                  {v.time_impact_days !== null && v.time_impact_days !== 0 && (
                    <span className="text-slate-500 dark:text-slate-400"> ({v.time_impact_days > 0 ? "+" : ""}{v.time_impact_days}d)</span>
                  )}
                </span>
                <span className="text-slate-500 dark:text-slate-400">{v.cost_impact !== null ? formatCurrency(v.cost_impact) : ""}</span>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {(paymentClaims ?? []).length > 0 && (
        <Card className="mt-4 p-5">
          <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Payment claims</h2>
          <ul className="mt-2 divide-y divide-slate-100 dark:divide-slate-800">
            {(paymentClaims ?? []).map((c) => (
              <li key={c.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                <span className="text-slate-900 dark:text-slate-100">
                  {c.claim_number ? `Claim ${c.claim_number}` : "Claim"} — {formatCurrency(c.amount_claimed)}
                  <span className="text-slate-500 dark:text-slate-400"> ({formatDate(c.claim_date)})</span>
                </span>
                <Badge tone={claimStatusTone[c.status] ?? "neutral"}>{c.status.replace("_", " ")}</Badge>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {allSubcontractors.length > 0 && (
        <Card className="mt-4 p-5">
          <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Trades on site</h2>
          <ul className="mt-2 divide-y divide-slate-100 dark:divide-slate-800">
            {allSubcontractors.map((s) => (
              <li key={s.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                <span className="text-slate-900 dark:text-slate-100">
                  {s.company_name}
                  {s.trade && <span className="text-slate-500 dark:text-slate-400"> — {s.trade}</span>}
                </span>
                <Badge tone="neutral">{s.status.replace("_", " ")}</Badge>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {progressHistory.length > 0 && (
        <Card className="mt-4 p-5">
          <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Progress history</h2>
          <ul className="mt-2 space-y-3 divide-y divide-slate-100 dark:divide-slate-800">
            {progressHistory.map((p, i) => (
              <li key={i} className={i > 0 ? "pt-3" : ""}>
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{formatDate(p.entry_date)}</p>
                  {p.percent_complete !== null && <span className="text-xs text-slate-400 dark:text-slate-500">{p.percent_complete}% complete</span>}
                </div>
                {p.summary && <p className="mt-1 text-sm text-slate-900 dark:text-slate-100">{p.summary}</p>}
              </li>
            ))}
          </ul>
        </Card>
      )}

      <div className="mt-4 print:hidden">
        <PrintButton />
      </div>

      <PrintFooter note="This report is a tracking summary, not a formal statement of account." />
    </div>
  );
}
