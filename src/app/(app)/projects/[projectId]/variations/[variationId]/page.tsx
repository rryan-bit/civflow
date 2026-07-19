import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { VariationActions } from "./variation-actions";
import { ClientApprovalLink } from "./client-approval-link";
import PrintButton from "./print-button";
import { BackLink } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Badge, BadgeTone } from "@/components/ui/badge";
import { PrintHeader } from "@/components/print/print-header";
import { PrintFooter } from "@/components/print/print-footer";

const statusTone: Record<string, BadgeTone> = {
  draft: "neutral",
  submitted: "amber",
  approved: "emerald",
  rejected: "red",
};

function formatDate(d: string | null) {
  if (!d) return null;
  return new Date(d).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

function formatDateTime(d: string | null) {
  if (!d) return null;
  return new Date(d).toLocaleString(undefined, { year: "numeric", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

function formatCurrency(n: number | null) {
  if (n === null) return null;
  return n.toLocaleString(undefined, { style: "currency", currency: "AUD", maximumFractionDigits: 0 });
}

export default async function VariationDetailPage({
  params,
}: {
  params: Promise<{ projectId: string; variationId: string }>;
}) {
  const { projectId, variationId } = await params;
  const supabase = await createClient();

  const { data: variation } = await supabase
    .from("variations")
    .select("*")
    .eq("id", variationId)
    .eq("project_id", projectId)
    .single();
  if (!variation) notFound();

  const { data: project } = await supabase.from("projects").select("id, name, site_address, company_id").eq("id", projectId).single();
  const { data: company } = project?.company_id
    ? await supabase.from("companies").select("name, qbcc_licence_number, logo_storage_path").eq("id", project.company_id).single()
    : { data: null };
  const logoUrl = company?.logo_storage_path
    ? supabase.storage.from("company-logos").getPublicUrl(company.logo_storage_path).data.publicUrl
    : null;

  const actorIds = [variation.raised_by, variation.approved_by].filter((id): id is string => Boolean(id));
  const { data: actors } = actorIds.length
    ? await supabase.from("profiles").select("id, full_name").in("id", actorIds)
    : { data: [] as { id: string; full_name: string | null }[] };
  const nameFor = (id: string | null) => (id ? actors?.find((a) => a.id === id)?.full_name ?? "Someone" : null);

  return (
    <div className="mx-auto max-w-2xl animate-fade-in">
      <span className="print:hidden">
        <BackLink href={`/projects/${projectId}/variations`}>Back to variations</BackLink>
      </span>

      <PrintHeader
        documentTitle="Variation Notice"
        companyName={company?.name}
        licenceNumber={company?.qbcc_licence_number}
        projectName={project?.name}
        siteAddress={project?.site_address}
        logoUrl={logoUrl}
      />

      <div className="mt-3 flex items-start justify-between gap-4 print:mt-0">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">{variation.title}</h1>
        <div className="flex shrink-0 items-center gap-2 print:hidden">
          <Badge tone={statusTone[variation.status]}>{variation.status}</Badge>
        </div>
      </div>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
        Raised by {nameFor(variation.raised_by) ?? "Unknown"} · {formatDate(variation.created_at)}
        {variation.requested_by_type && (
          <> · {variation.requested_by_type === "client" ? "Client requested" : "Builder-initiated"}</>
        )}
      </p>

      {variation.requested_by_type === "builder" && variation.reason && (
        <Card className="mt-4 p-5">
          <h2 className="text-sm font-medium text-slate-700 dark:text-slate-300">Reason (builder-initiated)</h2>
          <p className="mt-1.5 whitespace-pre-wrap text-sm text-slate-900 dark:text-slate-100">{variation.reason}</p>
        </Card>
      )}

      <div className="mt-6 grid grid-cols-2 gap-4">
        <Card className="p-5">
          <h2 className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">Cost impact</h2>
          <p className="mt-1.5 text-2xl font-semibold text-slate-900 dark:text-slate-100">
            {variation.cost_impact !== null ? formatCurrency(variation.cost_impact) : "—"}
          </p>
        </Card>
        <Card className="p-5">
          <h2 className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">Time impact</h2>
          <p className="mt-1.5 text-2xl font-semibold text-slate-900 dark:text-slate-100">
            {variation.time_impact_days !== null ? `${variation.time_impact_days}d` : "—"}
          </p>
        </Card>
      </div>

      {variation.description && (
        <Card className="mt-4 p-5">
          <h2 className="text-sm font-medium text-slate-700 dark:text-slate-300">Description</h2>
          <p className="mt-1.5 whitespace-pre-wrap text-sm text-slate-900 dark:text-slate-100">{variation.description}</p>
        </Card>
      )}

      {variation.status === "approved" || variation.status === "rejected" ? (
        <p className="mt-4 text-xs text-slate-500 dark:text-slate-400 print:hidden">
          {variation.status === "approved" ? "Approved internally" : "Rejected"} by {nameFor(variation.approved_by) ?? "Unknown"} ·{" "}
          {formatDate(variation.approved_at)}
        </p>
      ) : null}

      <Card className="mt-4 border-emerald-200/70 bg-emerald-50/60 p-5 print:hidden dark:border-emerald-900/50 dark:bg-emerald-950/20">
        <h2 className="text-sm font-semibold text-emerald-900 dark:text-emerald-300">Client sign-off</h2>
        {variation.client_approved_at ? (
          <p className="mt-1.5 text-sm text-emerald-800/90 dark:text-emerald-300/90">
            Approved by <span className="font-medium">{variation.client_approved_name}</span> on {formatDateTime(variation.client_approved_at)}.
            This is the record that matters if the cost is ever disputed.
          </p>
        ) : (
          <p className="mt-1.5 text-sm text-emerald-800/90 dark:text-emerald-300/90">
            Not yet signed off by the client{variation.client_name ? ` (${variation.client_name})` : ""}. Send the
            approval link below before work proceeds, if you can.
          </p>
        )}
      </Card>

      {/* Printed copy: if it's already signed off online, show that as the
          record; otherwise leave a wet-signature block for a client who'd
          rather sign on paper on site. */}
      {variation.client_approved_at ? (
        <div className="mt-8 hidden print:block">
          <p className="text-sm font-medium text-slate-900">Client approval</p>
          <p className="mt-1 text-sm text-slate-700">
            Approved by {variation.client_approved_name} on {formatDateTime(variation.client_approved_at)} via CivFlow client approval link.
          </p>
        </div>
      ) : (
        <div className="mt-10 hidden print:block">
          <p className="text-sm font-medium text-slate-900">Signatures</p>
          <div className="mt-6 grid grid-cols-2 gap-8">
            <div>
              <div className="h-10 border-b border-slate-500" />
              <p className="mt-1 text-xs text-slate-600">Client signature{variation.client_name ? ` — ${variation.client_name}` : ""}</p>
              <p className="mt-4 text-xs text-slate-600">Date: ______________</p>
            </div>
            <div>
              <div className="h-10 border-b border-slate-500" />
              <p className="mt-1 text-xs text-slate-600">Builder signature{company?.name ? ` — ${company.name}` : ""}</p>
              <p className="mt-4 text-xs text-slate-600">Date: ______________</p>
            </div>
          </div>
        </div>
      )}

      <div className="mt-4">
        <ClientApprovalLink token={variation.client_approval_token} />
      </div>

      <div className="mt-6">
        <VariationActions variation={variation} />
      </div>

      <div className="mt-4 print:hidden">
        <PrintButton />
      </div>

      <PrintFooter
        note={
          variation.client_approved_at
            ? `Client sign-off: ${variation.client_approved_name}, ${formatDateTime(variation.client_approved_at)}`
            : "Not yet signed off by the client"
        }
      />
    </div>
  );
}
