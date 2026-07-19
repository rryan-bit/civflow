import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ClaimActions } from "./claim-actions";
import { SupportingStatementPanel } from "./supporting-statement-panel";
import { XeroPushButton } from "./xero-push-button";
import { BackLink } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Badge, BadgeTone } from "@/components/ui/badge";

const statusTone: Record<string, BadgeTone> = {
  submitted: "amber",
  schedule_received: "blue",
  paid: "emerald",
  disputed: "red",
};

function formatCurrency(n: number) {
  return n.toLocaleString(undefined, { style: "currency", currency: "AUD" });
}

function daysUntil(dateStr: string): number {
  const diff = new Date(dateStr).getTime() - new Date().setHours(0, 0, 0, 0);
  return Math.round(diff / (1000 * 60 * 60 * 24));
}

export default async function PaymentClaimDetailPage({
  params,
}: {
  params: Promise<{ projectId: string; claimId: string }>;
}) {
  const { projectId, claimId } = await params;
  const supabase = await createClient();

  const { data: claim } = await supabase
    .from("payment_claims")
    .select("*")
    .eq("id", claimId)
    .eq("project_id", projectId)
    .single();
  if (!claim) notFound();

  const { data: xeroStatus } = await supabase.rpc("get_xero_connection_status");

  const { data: outstandingRows } = await supabase
    .from("subcontractor_payments")
    .select("id, amount_claimed, status, subcontractors(company_name)")
    .eq("project_id", projectId)
    .neq("status", "paid");

  const outstandingPayments = (outstandingRows ?? []).map((r) => ({
    id: r.id,
    amount_claimed: r.amount_claimed,
    status: r.status,
    subcontractorName: (r as unknown as { subcontractors: { company_name: string } | null }).subcontractors?.company_name ?? "Unknown subcontractor",
  }));

  const days = daysUntil(claim.due_date);
  const isOverdue = (claim.status === "submitted" || claim.status === "schedule_received") && days < 0;

  return (
    <div className="mx-auto max-w-2xl animate-fade-in">
      <BackLink href={`/projects/${projectId}/payment-claims`}>Back to Payment Claims</BackLink>

      <div className="mt-3 flex items-start justify-between gap-4">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">
          {claim.claim_number ? `Claim ${claim.claim_number}` : "Payment Claim"}
        </h1>
        <Badge tone={isOverdue ? "red" : statusTone[claim.status]} className="shrink-0">
          {isOverdue ? "overdue" : claim.status.replace("_", " ")}
        </Badge>
      </div>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
        Claimed {claim.claim_date} · Due {claim.due_date}
        {(claim.status === "submitted" || claim.status === "schedule_received") &&
          (isOverdue ? ` · overdue by ${Math.abs(days)}d` : ` · ${days}d remaining`)}
      </p>

      <Card className="mt-6 p-5">
        <h2 className="text-sm font-medium text-slate-700 dark:text-slate-300">Amounts</h2>
        <div className="mt-2 space-y-1 text-sm text-slate-900 dark:text-slate-100">
          <p>Claimed: {formatCurrency(claim.amount_claimed)}</p>
          {claim.scheduled_amount != null && (
            <p>
              Scheduled: {formatCurrency(claim.scheduled_amount)}
              {claim.scheduled_date && ` (received ${claim.scheduled_date})`}
            </p>
          )}
          {claim.paid_amount != null && (
            <p>
              Paid: {formatCurrency(claim.paid_amount)}
              {claim.paid_date && ` (on ${claim.paid_date})`}
            </p>
          )}
        </div>
      </Card>

      <Card className="mt-4 p-5">
        <h2 className="text-sm font-medium text-slate-700 dark:text-slate-300">Xero</h2>
        {claim.xero_invoice_id ? (
          <div className="mt-2 text-sm text-slate-700 dark:text-slate-300">
            <p>
              Synced to Xero{claim.xero_invoice_status ? ` — ${claim.xero_invoice_status.toLowerCase()}` : ""}
              {claim.xero_synced_at && ` (last checked ${new Date(claim.xero_synced_at).toLocaleDateString("en-AU")})`}
            </p>
          </div>
        ) : xeroStatus?.connected ? (
          <div className="mt-2">
            <XeroPushButton claimId={claim.id} />
          </div>
        ) : (
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            <Link href="/compliance" className="text-brand-orange hover:underline">
              Connect Xero
            </Link>{" "}
            to push this claim as an invoice.
          </p>
        )}
      </Card>

      <SupportingStatementPanel claim={claim} outstandingPayments={outstandingPayments} />

      {claim.notes && (
        <Card className="mt-4 p-5">
          <h2 className="text-sm font-medium text-slate-700 dark:text-slate-300">Notes</h2>
          <p className="mt-1.5 whitespace-pre-wrap text-sm text-slate-900 dark:text-slate-100">{claim.notes}</p>
        </Card>
      )}

      <div className="mt-6">
        <ClaimActions claim={claim} />
      </div>
    </div>
  );
}
