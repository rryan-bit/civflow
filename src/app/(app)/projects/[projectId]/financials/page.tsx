import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ContractForm } from "./contract-form";
import { ProjectTimeline } from "@/components/project-timeline";
import { BackLink, PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Badge, BadgeTone } from "@/components/ui/badge";
import { addDaysToDate, daysBetweenDates } from "@/lib/dates";
import { checkDepositCap, calculateEstimatedMargin, calculateMarginPercent, calculatePercentBilled } from "@/lib/financial-calcs";

const milestoneStatusTone: Record<string, BadgeTone> = {
  pending: "neutral",
  on_track: "emerald",
  at_risk: "amber",
  delayed: "red",
  complete: "blue",
};

function formatCurrency(n: number) {
  return n.toLocaleString(undefined, { style: "currency", currency: "AUD" });
}

function formatDate(d: string | null) {
  if (!d) return null;
  return new Date(d).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

export default async function FinancialsPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  const supabase = await createClient();

  const { data: project } = await supabase
    .from("projects")
    .select(
      "id, name, contract_value, deposit_amount, start_date, contracted_completion_date, practical_completion_date, home_warranty_premium_paid, home_warranty_premium_paid_date"
    )
    .eq("id", projectId)
    .single();
  if (!project) notFound();

  const [
    { data: variations },
    { data: paymentClaims },
    { data: subcontractors },
    { data: subPayments },
    { data: milestones },
    { data: materials },
    { data: timeEntries },
    { data: selections },
    { data: equipmentCheckouts },
  ] = await Promise.all([
    supabase.from("variations").select("cost_impact, time_impact_days, status").eq("project_id", projectId),
    supabase.from("payment_claims").select("amount_claimed, paid_amount, status").eq("project_id", projectId),
    supabase.from("subcontractors").select("contract_value, status").eq("project_id", projectId),
    supabase.from("subcontractor_payments").select("amount_claimed, retention_held, amount_paid, status").eq("project_id", projectId),
    supabase.from("milestones").select("id, name, status, target_date, actual_date, delay_reason").eq("project_id", projectId),
    supabase.from("materials").select("cost, status").eq("project_id", projectId),
    supabase.from("worker_time_entries").select("worker_id, hours").eq("project_id", projectId),
    supabase
      .from("selections")
      .select("category, allowance_amount, status, chosen_option_id")
      .eq("project_id", projectId),
    supabase.from("asset_checkouts").select("id, asset_id, total_cost, returned_date").eq("project_id", projectId),
  ]);

  const equipmentAssetIds = [...new Set((equipmentCheckouts ?? []).map((c) => c.asset_id))];
  const { data: equipmentAssets } = equipmentAssetIds.length
    ? await supabase.from("assets").select("id, name").in("id", equipmentAssetIds)
    : { data: [] as { id: string; name: string }[] };
  const assetNameById = new Map((equipmentAssets ?? []).map((a) => [a.id, a.name]));

  const chosenOptionIds = (selections ?? []).map((s) => s.chosen_option_id).filter((id): id is string => id !== null);
  const { data: chosenOptions } = chosenOptionIds.length
    ? await supabase.from("selection_options").select("id, cost").in("id", chosenOptionIds)
    : { data: [] as { id: string; cost: number | null }[] };
  const costByOptionId = new Map((chosenOptions ?? []).map((o) => [o.id, o.cost]));

  const workerIds = [...new Set((timeEntries ?? []).map((e) => e.worker_id))];
  const { data: workerRates } = workerIds.length
    ? await supabase.from("workers").select("id, hourly_rate").in("id", workerIds)
    : { data: [] };
  const rateByWorkerId = new Map((workerRates ?? []).map((w) => [w.id, w.hourly_rate]));

  const approvedVariations = (variations ?? []).filter((v) => v.status === "approved");
  const approvedVariationsCost = approvedVariations.reduce((sum, v) => sum + (v.cost_impact ?? 0), 0);
  const approvedVariationsDays = approvedVariations.reduce((sum, v) => sum + (v.time_impact_days ?? 0), 0);

  const originalContractValue = project.contract_value ?? 0;
  const revisedContractValue = originalContractValue + approvedVariationsCost;

  const totalClaimed = (paymentClaims ?? []).reduce((sum, c) => sum + c.amount_claimed, 0);
  const totalPaidByClient = (paymentClaims ?? []).reduce((sum, c) => sum + (c.paid_amount ?? 0), 0);
  const percentBilled = calculatePercentBilled(totalClaimed, revisedContractValue);
  const outstandingClaims = Math.max(0, totalClaimed - totalPaidByClient);

  const totalSubCommitted = (subcontractors ?? []).reduce((sum, s) => sum + (s.contract_value ?? 0), 0);
  const totalSubPaid = (subPayments ?? []).reduce((sum, p) => sum + (p.amount_paid ?? 0), 0);
  const totalSubRetentionHeld = (subPayments ?? []).reduce((sum, p) => sum + p.retention_held, 0);
  const totalSubOutstanding = (subPayments ?? [])
    .filter((p) => p.status !== "paid")
    .reduce((sum, p) => sum + p.amount_claimed, 0);

  const totalMaterialsCost = (materials ?? [])
    .filter((m) => m.status !== "cancelled")
    .reduce((sum, m) => sum + (m.cost ?? 0), 0);

  const totalWorkerHours = (timeEntries ?? []).reduce((sum, e) => sum + e.hours, 0);
  const totalLabourCost = (timeEntries ?? []).reduce((sum, e) => sum + e.hours * (rateByWorkerId.get(e.worker_id) ?? 0), 0);
  const hasUnratedHours = (timeEntries ?? []).some((e) => !rateByWorkerId.get(e.worker_id));

  const chosenSelections = (selections ?? []).filter((s) => s.status === "chosen" && s.chosen_option_id);
  const totalSelectionsAllowance = chosenSelections.reduce((sum, s) => sum + (s.allowance_amount ?? 0), 0);
  const totalSelectionsCost = chosenSelections.reduce((sum, s) => sum + (costByOptionId.get(s.chosen_option_id!) ?? 0), 0);
  const selectionsVariance = totalSelectionsCost - totalSelectionsAllowance;
  const pendingSelectionsCount = (selections ?? []).filter((s) => s.status !== "chosen").length;

  // Equipment/plant hired for this project — costed checkouts only count
  // towards Financials (a checkout with no cost recorded, e.g. an owned
  // tool someone grabbed, contributes $0 rather than being excluded).
  const totalEquipmentCost = (equipmentCheckouts ?? []).reduce((sum, c) => sum + (c.total_cost ?? 0), 0);
  const equipmentItems = (equipmentCheckouts ?? []).filter((c) => c.total_cost !== null);

  const hasContractValue = project.contract_value !== null;
  const estimatedMargin = hasContractValue
    ? calculateEstimatedMargin({
        revisedContractValue,
        totalSubCommitted,
        totalMaterialsCost: totalMaterialsCost + totalSelectionsCost + totalEquipmentCost,
        totalLabourCost,
      })
    : null;
  const estimatedMarginPct = estimatedMargin !== null ? calculateMarginPercent(estimatedMargin, revisedContractValue) : null;

  const forecastCompletion =
    project.practical_completion_date ??
    (project.contracted_completion_date ? addDaysToDate(project.contracted_completion_date, approvedVariationsDays) : null);
  const scheduleVarianceDays =
    project.contracted_completion_date && forecastCompletion ? daysBetweenDates(project.contracted_completion_date, forecastCompletion) : null;
  const isActualCompletion = project.practical_completion_date !== null;

  const allMilestones = milestones ?? [];
  const milestoneCounts = allMilestones.reduce(
    (acc, m) => {
      acc[m.status] = (acc[m.status] ?? 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );
  const delayedMilestones = allMilestones.filter((m) => m.status === "delayed");

  const { breached: depositBreach, percent: depositPercent, capRate: depositCapRate } = checkDepositCap(project.contract_value, project.deposit_amount);
  const depositPct = depositBreach && depositPercent !== null ? depositPercent.toFixed(1) : null;
  const needsHomeWarranty = (project.contract_value ?? 0) > 3300;
  const homeWarrantyOutstanding = needsHomeWarranty && !project.home_warranty_premium_paid;

  return (
    <div className="mx-auto max-w-2xl animate-fade-in">
      <BackLink href={`/projects/${projectId}`}>Back to project</BackLink>

      <div className="mt-3">
        <PageHeader
          title={`Financials & Schedule — ${project.name}`}
          subtitle="Contract value, billing progress, subcontractor cost commitment, and program status."
        />
      </div>

      {depositBreach && depositCapRate !== null && (
        <Card className="mt-6 border-red-200/80 bg-red-50 p-5 dark:border-red-900/50 dark:bg-red-950/20">
          <p className="text-sm font-medium text-red-900 dark:text-red-300">
            Deposit is {depositPct}% of the contract value — over the {depositCapRate}% cap for domestic building
            contracts at this value (QBCC Act Schedule 1B). Review this before it&apos;s taken, or seek advice if
            it&apos;s already been received.
          </p>
        </Card>
      )}

      {homeWarrantyOutstanding && (
        <Card className="mt-6 border-amber-200/80 bg-amber-50 p-5 dark:border-amber-900/50 dark:bg-amber-950/20">
          <p className="text-sm font-medium text-amber-900 dark:text-amber-300">
            This contract is over $3,300 and Home Warranty Insurance hasn&apos;t been marked as paid — the premium is
            mandatory on residential work above this threshold and must be remitted to QBCC within 10 business days
            of signing. Mark it below once paid.
          </p>
        </Card>
      )}

      <Card className="mt-6 p-5">
        <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Contract</h2>
        <div className="mt-3">
          <ContractForm
            projectId={projectId}
            contractValue={project.contract_value}
            depositAmount={project.deposit_amount}
            startDate={project.start_date}
            contractedCompletionDate={project.contracted_completion_date}
            homeWarrantyPremiumPaid={project.home_warranty_premium_paid}
            homeWarrantyPremiumPaidDate={project.home_warranty_premium_paid_date}
          />
        </div>
      </Card>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <Card className="p-5">
          <h3 className="text-sm font-medium text-slate-700 dark:text-slate-300">Contract value</h3>
          <p className="mt-2 text-2xl font-semibold text-slate-900 dark:text-slate-100">{formatCurrency(revisedContractValue)}</p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            {formatCurrency(originalContractValue)} original
            {approvedVariationsCost !== 0 && ` ${approvedVariationsCost > 0 ? "+" : ""}${formatCurrency(approvedVariationsCost)} approved variations`}
          </p>
          {!hasContractValue && (
            <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">Set an original contract value above to unlock billing % and margin.</p>
          )}
        </Card>

        <Card className="p-5">
          <h3 className="text-sm font-medium text-slate-700 dark:text-slate-300">Billing progress</h3>
          <p className="mt-2 text-2xl font-semibold text-slate-900 dark:text-slate-100">
            {formatCurrency(totalClaimed)}
            {percentBilled !== null && <span className="ml-1.5 text-sm font-normal text-slate-500 dark:text-slate-400">({percentBilled}% billed)</span>}
          </p>
          {percentBilled !== null && (
            <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
              <div className="h-full rounded-full bg-brand-orange" style={{ width: `${percentBilled}%` }} />
            </div>
          )}
          <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
            {formatCurrency(totalPaidByClient)} received · {formatCurrency(outstandingClaims)} outstanding
          </p>
        </Card>

        <Card className="p-5">
          <h3 className="text-sm font-medium text-slate-700 dark:text-slate-300">Subcontractor costs</h3>
          <p className="mt-2 text-2xl font-semibold text-slate-900 dark:text-slate-100">{formatCurrency(totalSubCommitted)}</p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">committed across all subcontractors</p>
          <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
            {formatCurrency(totalSubPaid)} paid · {formatCurrency(totalSubRetentionHeld)} retention held
            {totalSubOutstanding > 0 && ` · ${formatCurrency(totalSubOutstanding)} outstanding`}
          </p>
        </Card>

        <Card className="p-5">
          <h3 className="text-sm font-medium text-slate-700 dark:text-slate-300">Materials &amp; labour</h3>
          <p className="mt-2 text-2xl font-semibold text-slate-900 dark:text-slate-100">{formatCurrency(totalMaterialsCost + totalLabourCost)}</p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            {formatCurrency(totalMaterialsCost)} materials · {formatCurrency(totalLabourCost)} labour ({totalWorkerHours}h logged)
          </p>
          {hasUnratedHours && (
            <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">
              Some logged hours are for workers with no hourly rate set, so their cost isn&apos;t included — add a rate in Worker Hours to fix that.
            </p>
          )}
        </Card>

        {(chosenSelections.length > 0 || pendingSelectionsCount > 0) && (
          <Card className="p-5">
            <h3 className="text-sm font-medium text-slate-700 dark:text-slate-300">Selections</h3>
            <p className="mt-2 text-2xl font-semibold text-slate-900 dark:text-slate-100">{formatCurrency(totalSelectionsCost)}</p>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              {formatCurrency(totalSelectionsAllowance)} allowed ·{" "}
              {selectionsVariance === 0
                ? "on allowance"
                : `${formatCurrency(Math.abs(selectionsVariance))} ${selectionsVariance > 0 ? "over" : "under"} allowance`}
            </p>
            {pendingSelectionsCount > 0 && (
              <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">
                {pendingSelectionsCount} selection{pendingSelectionsCount === 1 ? "" : "s"} still awaiting a client choice.
              </p>
            )}
            <Link href={`/projects/${projectId}/selections`} className="mt-2 inline-block text-xs font-medium text-brand-orange hover:underline">
              View selections
            </Link>
          </Card>
        )}

        {(equipmentCheckouts ?? []).length > 0 && (
          <Card className="p-5">
            <h3 className="text-sm font-medium text-slate-700 dark:text-slate-300">Equipment &amp; plant hire</h3>
            <p className="mt-2 text-2xl font-semibold text-slate-900 dark:text-slate-100">{formatCurrency(totalEquipmentCost)}</p>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              {equipmentItems.length} costed hire{equipmentItems.length === 1 ? "" : "s"} on this project
              {(equipmentCheckouts ?? []).length > equipmentItems.length &&
                ` · ${(equipmentCheckouts ?? []).length - equipmentItems.length} with no cost recorded yet`}
            </p>
            {equipmentItems.length > 0 && (
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                {equipmentItems
                  .map((c) => assetNameById.get(c.asset_id) ?? "Equipment")
                  .slice(0, 3)
                  .join(", ")}
                {equipmentItems.length > 3 && ` +${equipmentItems.length - 3} more`}
              </p>
            )}
            <Link href="/equipment" className="mt-2 inline-block text-xs font-medium text-brand-orange hover:underline">
              View Tools &amp; Plant
            </Link>
          </Card>
        )}

        <Card className="p-5">
          <h3 className="text-sm font-medium text-slate-700 dark:text-slate-300">Estimated margin</h3>
          {estimatedMargin !== null ? (
            <>
              <p className="mt-2 text-2xl font-semibold text-slate-900 dark:text-slate-100">
                {formatCurrency(estimatedMargin)}
                {estimatedMarginPct !== null && <span className="ml-1.5 text-sm font-normal text-slate-500 dark:text-slate-400">({estimatedMarginPct}%)</span>}
              </p>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Revised contract value less subcontractor cost, logged materials (including chosen selections), logged worker hours, and equipment hire — still doesn&apos;t include overheads or your own unlogged time, so treat as a rough indicator, not a true P&amp;L.
              </p>
            </>
          ) : (
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Set an original contract value to see an estimate.</p>
          )}
        </Card>
      </div>

      <div className="mt-6">
        <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Schedule</h2>
        <Card className="mt-2 p-5">
          <div className="flex flex-wrap items-center gap-2">
            {project.contracted_completion_date && <Badge tone="blue">Contracted: {formatDate(project.contracted_completion_date)}</Badge>}
            {forecastCompletion && (
              <Badge tone={isActualCompletion ? "emerald" : "neutral"}>
                {isActualCompletion ? "Actual PC" : "Forecast"}: {formatDate(forecastCompletion)}
              </Badge>
            )}
            {approvedVariationsDays !== 0 && (
              <Badge tone={approvedVariationsDays > 0 ? "amber" : "emerald"}>
                {approvedVariationsDays > 0 ? "+" : ""}{approvedVariationsDays}d from approved variations
              </Badge>
            )}
            {scheduleVarianceDays !== null && (
              <Badge tone={scheduleVarianceDays <= 0 ? "emerald" : scheduleVarianceDays <= 14 ? "amber" : "red"}>
                {scheduleVarianceDays <= 0 ? `${Math.abs(scheduleVarianceDays)}d ahead or on time` : `${scheduleVarianceDays}d behind contracted date`}
              </Badge>
            )}
          </div>
          {!project.contracted_completion_date && (
            <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">Set a contracted completion date above to track schedule variance.</p>
          )}

          {allMilestones.length > 0 && (project.start_date || project.contracted_completion_date) && (
            <div className="mt-4 border-t border-slate-100 pt-4 dark:border-slate-800">
              <ProjectTimeline
                startDate={project.start_date}
                endDate={forecastCompletion ?? project.contracted_completion_date}
                milestones={allMilestones}
              />
            </div>
          )}

          <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-100 pt-4 dark:border-slate-800">
            {Object.entries(milestoneCounts).map(([status, count]) => (
              <Badge key={status} tone={milestoneStatusTone[status] ?? "neutral"}>{count} {status.replace("_", " ")}</Badge>
            ))}
            {!allMilestones.length && <p className="text-sm text-slate-500 dark:text-slate-400">No milestones tracked yet.</p>}
          </div>

          {delayedMilestones.length > 0 && (
            <ul className="mt-3 space-y-1.5">
              {delayedMilestones.map((m) => (
                <li key={m.id} className="text-xs text-red-600 dark:text-red-400">
                  {m.name}{m.delay_reason ? ` — ${m.delay_reason}` : " — no reason recorded"}
                </li>
              ))}
            </ul>
          )}

          <Link href={`/projects/${projectId}/milestones`} className="mt-3 inline-block text-xs font-medium text-brand-orange hover:underline">
            View / manage milestones
          </Link>
        </Card>
      </div>
    </div>
  );
}
