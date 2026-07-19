import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { EditSubcontractorForm } from "./edit-subcontractor-form";
import { QuotesPanel } from "./quotes-panel";
import { ContractPanel } from "./contract-panel";
import { PaymentsPanel } from "./payments-panel";
import { CompletionPanel } from "./completion-panel";
import { SubcontractorPortalLink } from "./portal-link";
import { UpdatesPanel } from "./updates-panel";
import { BackLink, PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Badge, BadgeTone } from "@/components/ui/badge";
import { buttonStyles } from "@/components/ui/button-styles";

const swmsStatusTone: Record<string, BadgeTone> = {
  current: "emerald",
  review_due: "amber",
  expired: "red",
  superseded: "neutral",
};

const subStatusTone: Record<string, BadgeTone> = {
  quoting: "amber",
  awarded: "blue",
  active: "emerald",
  complete: "slate",
  terminated: "red",
};

export default async function SubcontractorDetailPage({
  params,
}: {
  params: Promise<{ projectId: string; subcontractorId: string }>;
}) {
  const { projectId, subcontractorId } = await params;
  const supabase = await createClient();

  const { data: subcontractor } = await supabase
    .from("subcontractors")
    .select("*")
    .eq("id", subcontractorId)
    .eq("project_id", projectId)
    .single();
  if (!subcontractor) notFound();

  const [{ data: swmsRecords }, { data: quotes }, { data: payments }, { data: defects }, { data: updates }] = await Promise.all([
    supabase.from("swms").select("id, title, status, review_due_date").eq("subcontractor_id", subcontractorId).order("created_at", { ascending: false }),
    supabase.from("subcontractor_quotes").select("*").eq("subcontractor_id", subcontractorId).order("created_at", { ascending: false }),
    supabase.from("subcontractor_payments").select("*").eq("subcontractor_id", subcontractorId).order("claim_date", { ascending: false }),
    supabase.from("defects").select("*").eq("subcontractor_id", subcontractorId).order("noted_date", { ascending: false }),
    supabase.from("subcontractor_updates").select("*").eq("subcontractor_id", subcontractorId).order("created_at", { ascending: false }),
  ]);

  const quoteIds = (quotes ?? []).map((q) => q.id);
  const { data: quoteItemsRaw } = quoteIds.length
    ? await supabase
        .from("subcontractor_quote_items")
        .select("id, subcontractor_quote_id, description, amount, item_date, sort_order")
        .in("subcontractor_quote_id", quoteIds)
        .order("sort_order", { ascending: true })
    : { data: [] as { id: string; subcontractor_quote_id: string; description: string; amount: number | null; item_date: string | null; sort_order: number }[] };

  const quoteItemsByQuoteId = new Map<string, typeof quoteItemsRaw>();
  for (const item of quoteItemsRaw ?? []) {
    const list = quoteItemsByQuoteId.get(item.subcontractor_quote_id) ?? [];
    list.push(item);
    quoteItemsByQuoteId.set(item.subcontractor_quote_id, list);
  }

  const totalRetentionHeld = (payments ?? []).reduce((sum, p) => sum + p.retention_held, 0);

  return (
    <div className="mx-auto max-w-2xl animate-fade-in">
      <BackLink href={`/projects/${projectId}/subcontractors`}>Back to Subcontractors</BackLink>

      <div className="mt-3 flex items-start justify-between gap-4">
        <PageHeader title={subcontractor.company_name} subtitle={subcontractor.trade ?? undefined} />
        <Badge tone={subStatusTone[subcontractor.status]} className="mt-1 shrink-0">{subcontractor.status}</Badge>
      </div>

      <Card className="mt-6 p-5">
        <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Contact &amp; compliance</h2>
        <EditSubcontractorForm subcontractor={subcontractor} />
      </Card>

      <div className="mt-6">
        <SubcontractorPortalLink token={subcontractor.portal_token} />
      </div>

      <div className="mt-6">
        <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Quotes</h2>
        <div className="mt-2">
          <QuotesPanel subcontractor={subcontractor} quotes={quotes ?? []} itemsByQuoteId={quoteItemsByQuoteId} />
        </div>
      </div>

      <div className="mt-6">
        <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Updates from {subcontractor.company_name}</h2>
        <div className="mt-2">
          <UpdatesPanel updates={updates ?? []} />
        </div>
      </div>

      <div className="mt-6">
        <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Contract</h2>
        <div className="mt-2">
          <ContractPanel subcontractor={subcontractor} />
        </div>
      </div>

      {subcontractor.status !== "quoting" && (
        <div className="mt-6">
          <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Progress payments</h2>
          <div className="mt-2">
            <PaymentsPanel subcontractor={subcontractor} payments={payments ?? []} />
          </div>
        </div>
      )}

      <div className="mt-6">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300">SWMS</h2>
          <Link
            href={`/projects/${projectId}/swms/new?subcontractorId=${subcontractorId}`}
            className={buttonStyles("outline", "sm")}
          >
            + Add SWMS
          </Link>
        </div>
        <Card className="mt-2 divide-y divide-slate-100 overflow-hidden p-0 dark:divide-slate-800/80">
          {swmsRecords?.map((s) => (
            <Link
              key={s.id}
              href={`/projects/${projectId}/swms/${s.id}`}
              className="flex items-center justify-between gap-3 px-4 py-3 text-sm transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/60"
            >
              <span className="min-w-0 truncate text-slate-900 dark:text-slate-100">{s.title}</span>
              <Badge tone={swmsStatusTone[s.status]} className="shrink-0">{s.status.replace("_", " ")}</Badge>
            </Link>
          ))}
          {!swmsRecords?.length && (
            <p className="px-4 py-6 text-center text-sm text-slate-500 dark:text-slate-400">No SWMS recorded for this subcontractor yet.</p>
          )}
        </Card>
      </div>

      {subcontractor.status !== "quoting" && (
        <div className="mt-6">
          <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Completion &amp; retention</h2>
          <div className="mt-2">
            <CompletionPanel subcontractor={subcontractor} totalRetentionHeld={totalRetentionHeld} defects={defects ?? []} />
          </div>
        </div>
      )}
    </div>
  );
}
