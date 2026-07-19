import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import EntriesList from "./entries-list";
import { AskChat } from "./ask/ask-chat";
import { ProjectFinancialCharts } from "./project-financial-charts";
import { PortalLink } from "./portal-link";
import { SubcontractorActivity, type SubcontractorActivityItem } from "./subcontractor-activity";
import { BackLink, PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { buttonStyles } from "@/components/ui/button-styles";
import { calculateEstimatedMargin } from "@/lib/financial-calcs";

const RfiIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    <path d="M12 8v4M12 15h.01" />
  </svg>
);
const VariationIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 3l4 4-4 4M3 7h18M7 21l-4-4 4-4M21 17H3" />
  </svg>
);
const MilestoneIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 22V4M4 4l14 0-3 4 3 4H4" />
  </svg>
);
const SafetyIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 2 4 5v6c0 5 3.4 9.4 8 11 4.6-1.6 8-6 8-11V5l-8-3Z" />
  </svg>
);
const AskIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 3a9 9 0 0 0-7.5 14L3 21l4.2-1.4A9 9 0 1 0 12 3Z" />
    <path d="M9 10h.01M12 10h.01M15 10h.01" />
  </svg>
);
const DtrIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 11l3 3L22 4" />
    <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
  </svg>
);
const PaymentIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v10M15 9.5c0-1.4-1.3-2.5-3-2.5s-3 1-3 2.2 1 1.8 3 2.3 3 1.1 3 2.3-1.3 2.2-3 2.2-3-1.1-3-2.5" />
  </svg>
);
const SubcontractorIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
);
const SwmsIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 2h6v4H9z" />
    <path d="M9 4H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2h-3" />
    <path d="M9 12h6M9 16h6" />
  </svg>
);
const InspectionIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="7" />
    <path d="m20 20-3.5-3.5M8.5 11l2 2 3-4" />
  </svg>
);
const NcrIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="9" />
    <path d="m9.5 9.5 5 5M14.5 9.5l-5 5" />
  </svg>
);
const DocumentsIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <path d="M14 2v6h6" />
  </svg>
);
const WorkerHoursIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5l3 3" />
  </svg>
);
const MaterialsIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 8V6a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 6v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0" />
    <path d="M3.27 6.96 12 12.01l8.73-5.05M12 22.08V12" />
    <path d="M17 14l2 2 4-4" />
  </svg>
);
const FinancialsIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 3v18h18" />
    <path d="M7 16l4-6 3 3 5-7" />
  </svg>
);
const HandoverIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 22V4a1 1 0 0 1 1-1h13l-2.5 4L18 11H5" />
  </svg>
);
const CrewIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
    <circle cx="17" cy="7" r="3" opacity="0.55" />
  </svg>
);
const ReportIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <path d="M14 2v6h6" />
    <path d="M9 17v-3M12 17v-5M15 17v-2" />
  </svg>
);
const ChatIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
  </svg>
);
const EotIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5l3 3" />
    <path d="M4.2 4.2 6 6M19.8 4.2 18 6" />
  </svg>
);
const SelectionIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 11l3 3L22 4" />
    <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
    <circle cx="6" cy="18" r="1" />
  </svg>
);

export default async function ProjectPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const supabase = await createClient();

  const { data: project } = await supabase
    .from("projects")
    .select("id, name, site_address, status, contract_value, client_portal_token")
    .eq("id", projectId)
    .single();

  if (!project) notFound();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: viewerProfile } = await supabase.from("profiles").select("company_id").eq("id", user!.id).single();
  const { data: viewerCompany } = viewerProfile?.company_id
    ? await supabase.from("companies").select("company_type").eq("id", viewerProfile.company_id).single()
    : { data: null };
  const isResidential = viewerCompany?.company_type === "residential_builder";

  const { data: entries } = await supabase
    .from("diary_entries")
    .select("id, entry_date, status")
    .eq("project_id", projectId)
    .order("entry_date", { ascending: false });

  const [
    { count: openRfis },
    { count: openVariations },
    { count: milestonesCount },
    { count: openDtrCount },
    { count: awaitingPaymentCount },
    { count: subcontractorCount },
    { count: swmsNeedsReviewCount },
    { count: pendingInspectionsCount },
    { count: openNcrCount },
    { count: flaggedMaterialsCount },
    { count: documentsCount },
    { count: crewCount },
    { count: unansweredQuestionsCount },
    { count: selectionsAwaitingCount },
    { count: openEotCount },
  ] = await Promise.all([
    supabase.from("rfis").select("id", { count: "exact", head: true }).eq("project_id", projectId).eq("status", "open"),
    supabase
      .from("variations")
      .select("id", { count: "exact", head: true })
      .eq("project_id", projectId)
      .in("status", ["draft", "submitted"]),
    supabase.from("milestones").select("id", { count: "exact", head: true }).eq("project_id", projectId),
    supabase
      .from("directions_to_rectify")
      .select("id", { count: "exact", head: true })
      .eq("project_id", projectId)
      .in("status", ["open", "disputed"]),
    supabase
      .from("payment_claims")
      .select("id", { count: "exact", head: true })
      .eq("project_id", projectId)
      .in("status", ["submitted", "schedule_received"]),
    supabase.from("subcontractors").select("id", { count: "exact", head: true }).eq("project_id", projectId),
    supabase
      .from("swms")
      .select("id", { count: "exact", head: true })
      .eq("project_id", projectId)
      .in("status", ["review_due", "expired"]),
    supabase
      .from("inspections")
      .select("id", { count: "exact", head: true })
      .eq("project_id", projectId)
      .eq("status", "pending"),
    supabase
      .from("non_conformance_reports")
      .select("id", { count: "exact", head: true })
      .eq("project_id", projectId)
      .eq("status", "open"),
    supabase
      .from("materials")
      .select("id", { count: "exact", head: true })
      .eq("project_id", projectId)
      .in("status", ["short", "damaged"]),
    supabase.from("documents").select("id", { count: "exact", head: true }).eq("project_id", projectId),
    supabase.from("project_workers").select("id", { count: "exact", head: true }).eq("project_id", projectId),
    supabase
      .from("worker_questions")
      .select("id", { count: "exact", head: true })
      .eq("project_id", projectId)
      .is("answer", null),
    supabase
      .from("selections")
      .select("id", { count: "exact", head: true })
      .eq("project_id", projectId)
      .in("status", ["draft", "awaiting_choice"]),
    supabase
      .from("eot_claims")
      .select("id", { count: "exact", head: true })
      .eq("project_id", projectId)
      .in("status", ["open", "notice_sent"]),
  ]);

  const [
    { data: approvedVariations },
    { data: paymentClaims },
    { data: subcontractorContracts },
    { data: materialsCosts },
    { data: timeEntries },
    { data: subcontractorNames },
    { data: portalQuotes },
    { data: portalUpdates },
    { data: equipmentCheckouts },
  ] = await Promise.all([
    supabase.from("variations").select("cost_impact").eq("project_id", projectId).eq("status", "approved"),
    supabase.from("payment_claims").select("amount_claimed, paid_amount").eq("project_id", projectId),
    supabase.from("subcontractors").select("contract_value").eq("project_id", projectId),
    supabase.from("materials").select("cost").eq("project_id", projectId).neq("status", "cancelled"),
    supabase.from("worker_time_entries").select("worker_id, hours").eq("project_id", projectId),
    supabase.from("subcontractors").select("id, company_name").eq("project_id", projectId),
    supabase
      .from("subcontractor_quotes")
      .select("id, subcontractor_id, description, amount, created_at")
      .eq("project_id", projectId)
      .eq("status", "received")
      .eq("submitted_via_portal", true)
      .order("created_at", { ascending: false }),
    supabase
      .from("subcontractor_updates")
      .select("id, subcontractor_id, message, update_type, created_at")
      .eq("project_id", projectId)
      .is("acknowledged_at", null)
      .order("created_at", { ascending: false }),
    supabase.from("asset_checkouts").select("total_cost").eq("project_id", projectId),
  ]);

  const subNameById = new Map((subcontractorNames ?? []).map((s) => [s.id, s.company_name]));
  const activityItems: SubcontractorActivityItem[] = [
    ...(portalQuotes ?? []).map((q) => ({
      id: q.id,
      kind: "quote" as const,
      subcontractorId: q.subcontractor_id,
      subcontractorName: subNameById.get(q.subcontractor_id) ?? "A subcontractor",
      label: q.amount !== null ? `${q.description} — ${q.amount.toLocaleString(undefined, { style: "currency", currency: "AUD", maximumFractionDigits: 0 })}` : q.description,
      createdAt: q.created_at,
    })),
    ...(portalUpdates ?? []).map((u) => ({
      id: u.id,
      kind: "update" as const,
      subcontractorId: u.subcontractor_id,
      subcontractorName: subNameById.get(u.subcontractor_id) ?? "A subcontractor",
      label: u.message.length > 80 ? `${u.message.slice(0, 79)}…` : u.message,
      createdAt: u.created_at,
      isUrgent: u.update_type === "delay_or_issue",
    })),
  ].sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  const workerIds = [...new Set((timeEntries ?? []).map((e) => e.worker_id))];
  const { data: workerRates } = workerIds.length
    ? await supabase.from("workers").select("id, hourly_rate").in("id", workerIds)
    : { data: [] };
  const rateByWorkerId = new Map((workerRates ?? []).map((w) => [w.id, w.hourly_rate]));

  const hasContractValue = project.contract_value !== null;
  const approvedVariationsCost = (approvedVariations ?? []).reduce((sum, v) => sum + (v.cost_impact ?? 0), 0);
  const revisedContractValue = (project.contract_value ?? 0) + approvedVariationsCost;
  const totalClaimed = (paymentClaims ?? []).reduce((sum, c) => sum + c.amount_claimed, 0);
  const totalPaidByClient = (paymentClaims ?? []).reduce((sum, c) => sum + (c.paid_amount ?? 0), 0);
  const totalSubCommitted = (subcontractorContracts ?? []).reduce((sum, s) => sum + (s.contract_value ?? 0), 0);
  const totalMaterialsCost = (materialsCosts ?? []).reduce((sum, m) => sum + (m.cost ?? 0), 0);
  const totalLabourCost = (timeEntries ?? []).reduce((sum, e) => sum + e.hours * (rateByWorkerId.get(e.worker_id) ?? 0), 0);
  const totalEquipmentCost = (equipmentCheckouts ?? []).reduce((sum, c) => sum + (c.total_cost ?? 0), 0);
  const estimatedMargin = hasContractValue
    ? calculateEstimatedMargin({
        revisedContractValue,
        totalSubCommitted,
        totalMaterialsCost: totalMaterialsCost + totalEquipmentCost,
        totalLabourCost,
      })
    : null;

  const dayToDayModules = [
    { href: `/projects/${projectId}/rfis`, label: "RFIs", icon: <RfiIcon />, meta: openRfis ? `${openRfis} open` : "None open" },
    { href: `/projects/${projectId}/variations`, label: "Variations", icon: <VariationIcon />, meta: openVariations ? `${openVariations} pending` : "None pending" },
    { href: `/projects/${projectId}/materials`, label: "Materials & Deliveries", icon: <MaterialsIcon />, meta: flaggedMaterialsCount ? `${flaggedMaterialsCount} flagged` : "None flagged" },
    { href: `/projects/${projectId}/worker-hours`, label: "Worker Hours", icon: <WorkerHoursIcon />, meta: "Who worked, and when" },
    { href: `/projects/${projectId}/documents`, label: "Documents", icon: <DocumentsIcon />, meta: documentsCount ? `${documentsCount} on file` : "None uploaded" },
    {
      href: `/projects/${projectId}/crew`,
      label: "Crew",
      icon: <CrewIcon />,
      meta: unansweredQuestionsCount ? `${unansweredQuestionsCount} question${unansweredQuestionsCount === 1 ? "" : "s"} waiting` : crewCount ? `${crewCount} assigned` : "None assigned",
    },
    { href: `/projects/${projectId}/chat`, label: "Chat", icon: <ChatIcon />, meta: "Message the team & subcontractors" },
    { href: `/projects/${projectId}/selections`, label: "Selections", icon: <SelectionIcon />, meta: selectionsAwaitingCount ? `${selectionsAwaitingCount} awaiting decision` : "None pending" },
    { href: `/projects/${projectId}/milestones`, label: "Milestones", icon: <MilestoneIcon />, meta: milestonesCount ? `${milestonesCount} tracked` : "None yet" },
    { href: `/projects/${projectId}/financials`, label: "Financials & Schedule", icon: <FinancialsIcon />, meta: "Cost, billing & program status" },
    { href: `/projects/${projectId}/safety`, label: "Safety", icon: <SafetyIcon />, meta: "Register & toolbox talks" },
    { href: `/projects/${projectId}/report`, label: "Client Report", icon: <ReportIcon />, meta: "Generate a report to send" },
  ];

  const complianceModules = [
    { href: `/projects/${projectId}/directions-to-rectify`, label: "Directions to Rectify", icon: <DtrIcon />, meta: openDtrCount ? `${openDtrCount} open` : "None open", advanced: true },
    { href: `/projects/${projectId}/payment-claims`, label: "Payment Claims", icon: <PaymentIcon />, meta: awaitingPaymentCount ? `${awaitingPaymentCount} awaiting payment` : "None outstanding", advanced: false },
    { href: `/projects/${projectId}/subcontractors`, label: "Subcontractors", icon: <SubcontractorIcon />, meta: subcontractorCount ? `${subcontractorCount} on register` : "None added", advanced: false },
    { href: `/projects/${projectId}/swms`, label: "SWMS", icon: <SwmsIcon />, meta: swmsNeedsReviewCount ? `${swmsNeedsReviewCount} need review` : "All current", advanced: false },
    { href: `/projects/${projectId}/inspections`, label: "Inspections", icon: <InspectionIcon />, meta: pendingInspectionsCount ? `${pendingInspectionsCount} pending` : "None pending", advanced: true },
    { href: `/projects/${projectId}/ncrs`, label: "NCRs", icon: <NcrIcon />, meta: openNcrCount ? `${openNcrCount} open` : "None open", advanced: true },
    { href: `/projects/${projectId}/practical-completion`, label: "Practical Completion", icon: <HandoverIcon />, meta: "Defects, DLP & handover", advanced: false },
    { href: `/projects/${projectId}/eot-claims`, label: "Extension of Time", icon: <EotIcon />, meta: openEotCount ? `${openEotCount} active` : "None active", advanced: false },
  ].filter((m) => !isResidential || !m.advanced);

  return (
    <div className="animate-fade-in">
      <BackLink href="/dashboard">All projects</BackLink>

      <div className="mt-3">
        <PageHeader
          title={project.name}
          subtitle={
            <span className="flex items-center gap-2">
              {project.site_address}
              <Badge tone={project.status === "active" ? "emerald" : "neutral"}>{project.status}</Badge>
            </span>
          }
          actions={
            <>
              <Link href={`/projects/${projectId}/edit`} className={buttonStyles("outline", "md")}>
                Edit
              </Link>
              <Link href={`/projects/${projectId}/new-entry`} className={buttonStyles("primary", "md")}>
                + New site diary entry
              </Link>
            </>
          }
        />
      </div>

      <div className="mt-6">
        <PortalLink token={project.client_portal_token} />
      </div>

      <SubcontractorActivity projectId={projectId} items={activityItems} />

      <div className="mt-8">
        <ProjectFinancialCharts
          projectId={projectId}
          hasContractValue={hasContractValue}
          revisedContractValue={revisedContractValue}
          totalClaimed={totalClaimed}
          totalPaidByClient={totalPaidByClient}
          totalSubCommitted={totalSubCommitted}
          totalMaterialsCost={totalMaterialsCost}
          totalLabourCost={totalLabourCost}
          totalEquipmentCost={totalEquipmentCost}
          estimatedMargin={estimatedMargin}
        />
      </div>

      <h2 className="mt-8 text-sm font-semibold text-slate-700 dark:text-slate-300">Day-to-day</h2>
      <div className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {dayToDayModules.map((m) => (
          <Link key={m.href} href={m.href}>
            <Card interactive className="h-full p-4">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                {m.icon}
              </span>
              <p className="mt-2.5 text-sm font-medium text-slate-900 dark:text-slate-100">{m.label}</p>
              <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{m.meta}</p>
            </Card>
          </Link>
        ))}
      </div>

      <h2 className="mt-8 text-sm font-semibold text-slate-700 dark:text-slate-300">Compliance &amp; quality</h2>
      <div className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {complianceModules.map((m) => (
          <Link key={m.href} href={m.href}>
            <Card interactive className="h-full p-4">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                {m.icon}
              </span>
              <p className="mt-2.5 text-sm font-medium text-slate-900 dark:text-slate-100">{m.label}</p>
              <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{m.meta}</p>
            </Card>
          </Link>
        ))}
      </div>
      {isResidential && (
        <p className="mt-2 text-xs text-slate-400 dark:text-slate-500">
          Need Directions to Rectify, formal inspections, or NCRs? Switch to the full toolset in{" "}
          <Link href="/compliance" className="font-medium text-brand-orange hover:underline">Compliance settings</Link>.
        </p>
      )}

      <div className="mt-8">
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-navy text-white dark:bg-brand-orange">
            <AskIcon />
          </span>
          <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Ask CivFlow</h2>
        </div>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Ask about progress, delays, open RFIs, safety, or anything else logged on this project — or tell it to log
          something (an RFI, variation, payment claim, and more) and it&apos;ll create it for you.
        </p>
        <div className="mt-3">
          <AskChat projectId={projectId} />
        </div>
      </div>

      <div className="mt-8">
        <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Site diary entries</h2>
        <EntriesList projectId={projectId} entries={entries ?? []} />
      </div>
    </div>
  );
}
