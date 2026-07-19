import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { EotClaimActions } from "./eot-claim-actions";
import { BackLink } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Badge, BadgeTone } from "@/components/ui/badge";
import { PrintHeader } from "@/components/print/print-header";
import { PrintFooter } from "@/components/print/print-footer";
import { PrintButton } from "@/components/print/print-button";
import { daysBetween } from "@/lib/dates";

const statusTone: Record<string, BadgeTone> = {
  open: "amber",
  notice_sent: "blue",
  granted: "emerald",
  rejected: "red",
};

const statusLabel: Record<string, string> = {
  open: "notice not sent",
  notice_sent: "notice sent",
  granted: "granted",
  rejected: "rejected",
};

const causeLabel: Record<string, string> = {
  weather: "Weather",
  latent_conditions: "Latent conditions",
  client_variation: "Client-caused delay",
  subcontractor_delay: "Subcontractor delay",
  authority_delay: "Authority/approval delay",
  other: "Other",
};

function formatDate(d: string | null) {
  if (!d) return null;
  return new Date(d).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

export default async function EotClaimDetailPage({
  params,
}: {
  params: Promise<{ projectId: string; claimId: string }>;
}) {
  const { projectId, claimId } = await params;
  const supabase = await createClient();

  const { data: claim } = await supabase
    .from("eot_claims")
    .select("*")
    .eq("id", claimId)
    .eq("project_id", projectId)
    .single();
  if (!claim) notFound();

  const [{ data: project }, { data: milestone }, { data: creator }] = await Promise.all([
    supabase.from("projects").select("id, name, site_address, company_id").eq("id", projectId).single(),
    claim.milestone_id
      ? supabase.from("milestones").select("id, name").eq("id", claim.milestone_id).single()
      : Promise.resolve({ data: null }),
    claim.created_by
      ? supabase.from("profiles").select("id, full_name").eq("id", claim.created_by).single()
      : Promise.resolve({ data: null }),
  ]);

  const { data: company } = project?.company_id
    ? await supabase.from("companies").select("name, qbcc_licence_number, logo_storage_path").eq("id", project.company_id).single()
    : { data: null };
  const logoUrl = company?.logo_storage_path
    ? supabase.storage.from("company-logos").getPublicUrl(company.logo_storage_path).data.publicUrl
    : null;

  const noticeDaysRemaining = claim.status === "open" ? daysBetween(claim.notice_due_date) : null;
  const noticeOverdue = noticeDaysRemaining !== null && noticeDaysRemaining < 0;

  return (
    <div className="mx-auto max-w-2xl animate-fade-in">
      <span className="print:hidden">
        <BackLink href={`/projects/${projectId}/eot-claims`}>Back to EOT claims</BackLink>
      </span>

      <PrintHeader
        documentTitle="Notice of Delay / Extension of Time Claim"
        companyName={company?.name}
        licenceNumber={company?.qbcc_licence_number}
        projectName={project?.name}
        siteAddress={project?.site_address}
        logoUrl={logoUrl}
      />

      <div className="mt-3 flex items-start justify-between gap-4 print:mt-0">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">{claim.title}</h1>
        <div className="flex shrink-0 items-center gap-2 print:hidden">
          <Badge tone={statusTone[claim.status]}>{statusLabel[claim.status]}</Badge>
        </div>
      </div>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
        {causeLabel[claim.cause] ?? claim.cause} · logged by {creator?.full_name ?? "Unknown"} · {formatDate(claim.created_at)}
        {milestone && ` · relates to milestone "${milestone.name}"`}
      </p>

      {claim.status === "open" && (
        <Card className={`mt-4 p-5 print:hidden ${noticeOverdue ? "border-red-200/80 bg-red-50 dark:border-red-900/50 dark:bg-red-950/20" : "border-amber-200/80 bg-amber-50 dark:border-amber-800/60 dark:bg-amber-950/30"}`}>
          <p className={`text-sm font-medium ${noticeOverdue ? "text-red-900 dark:text-red-300" : "text-amber-900 dark:text-amber-200"}`}>
            {noticeOverdue
              ? `Notice deadline was ${formatDate(claim.notice_due_date)} — ${Math.abs(noticeDaysRemaining!)}d overdue. Sending notice late risks losing the right to claim this extension.`
              : `Notice due by ${formatDate(claim.notice_due_date)} — ${noticeDaysRemaining}d left.`}
          </p>
        </Card>
      )}

      <div className="mt-6 grid grid-cols-2 gap-4">
        <Card className="p-5">
          <h2 className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">Became aware</h2>
          <p className="mt-1.5 text-lg font-semibold text-slate-900 dark:text-slate-100">{formatDate(claim.date_became_aware)}</p>
        </Card>
        <Card className="p-5">
          <h2 className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">Days claimed</h2>
          <p className="mt-1.5 text-lg font-semibold text-slate-900 dark:text-slate-100">{claim.days_claimed !== null ? `${claim.days_claimed}d` : "—"}</p>
        </Card>
      </div>

      {claim.description && (
        <Card className="mt-4 p-5">
          <h2 className="text-sm font-medium text-slate-700 dark:text-slate-300">Description</h2>
          <p className="mt-1.5 whitespace-pre-wrap text-sm text-slate-900 dark:text-slate-100">{claim.description}</p>
        </Card>
      )}

      {/* Printed notice body — the actual letter to send the client. */}
      <div className="mt-6 hidden print:block">
        <p className="text-sm text-slate-900">
          This letter serves as formal notice under the contract that a delay has occurred, as follows:
        </p>
        <p className="mt-3 text-sm text-slate-900"><strong>Cause of delay:</strong> {causeLabel[claim.cause] ?? claim.cause}</p>
        <p className="mt-1 text-sm text-slate-900"><strong>Date became aware:</strong> {formatDate(claim.date_became_aware)}</p>
        {claim.days_claimed !== null && <p className="mt-1 text-sm text-slate-900"><strong>Extension claimed:</strong> {claim.days_claimed} day{claim.days_claimed === 1 ? "" : "s"}</p>}
        {claim.description && <p className="mt-3 whitespace-pre-wrap text-sm text-slate-900">{claim.description}</p>}
        <div className="mt-10 grid grid-cols-2 gap-8">
          <div>
            <div className="h-10 border-b border-slate-500" />
            <p className="mt-1 text-xs text-slate-600">Sent by — {company?.name}</p>
            <p className="mt-4 text-xs text-slate-600">Date: {formatDate(new Date().toISOString())}</p>
          </div>
        </div>
      </div>

      <div className="mt-6">
        <EotClaimActions claim={claim} />
      </div>

      <div className="mt-4 print:hidden">
        <PrintButton label="Print notice / Save as PDF" />
      </div>

      <PrintFooter
        note={
          claim.notice_sent_at
            ? `Notice sent: ${formatDate(claim.notice_sent_at)}${claim.notice_sent_note ? ` — ${claim.notice_sent_note}` : ""}`
            : "Notice not yet sent"
        }
      />
    </div>
  );
}
