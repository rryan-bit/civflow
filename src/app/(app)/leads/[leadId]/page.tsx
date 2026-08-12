import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { BackLink, PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Badge, BadgeTone } from "@/components/ui/badge";
import type { LeadStatus } from "@/types/database";
import { LeadPipelineActions } from "./lead-pipeline-actions";
import { LeadEditForm } from "./lead-edit-form";
import { LeadFollowUps } from "./lead-follow-ups";
import { LeadNotes } from "./lead-notes";

const statusTone: Record<LeadStatus, BadgeTone> = {
  enquiry: "neutral",
  quoting: "amber",
  quote_sent: "blue",
  won: "emerald",
  lost: "red",
};

const statusLabel: Record<LeadStatus, string> = {
  enquiry: "Enquiry",
  quoting: "Quoting",
  quote_sent: "Quote sent",
  won: "Won",
  lost: "Lost",
};

function formatCurrency(n: number) {
  return n.toLocaleString(undefined, { style: "currency", currency: "AUD" });
}

export default async function LeadDetailPage({ params }: { params: Promise<{ leadId: string }> }) {
  const { leadId } = await params;
  const supabase = await createClient();

  const { data: lead } = await supabase.from("leads").select("*").eq("id", leadId).single();
  if (!lead) notFound();

  const [{ data: followUps }, { data: notes }] = await Promise.all([
    supabase.from("lead_follow_ups").select("*").eq("lead_id", leadId).order("created_at", { ascending: false }),
    supabase.from("lead_notes").select("*").eq("lead_id", leadId).order("created_at", { ascending: false }),
  ]);

  const authorIds = [...new Set([...(followUps ?? []).map((f) => f.created_by), ...(notes ?? []).map((n) => n.created_by)])].filter(
    (id): id is string => !!id
  );
  const { data: authors } = authorIds.length
    ? await supabase.from("profiles").select("id, full_name").in("id", authorIds)
    : { data: [] as { id: string; full_name: string | null }[] };
  const authorName = (id: string | null) => (id ? authors?.find((a) => a.id === id)?.full_name ?? "A team member" : "A team member");

  return (
    <div className="mx-auto max-w-2xl animate-fade-in">
      <BackLink href="/leads">Back to Leads</BackLink>

      <div className="mt-3 flex items-start justify-between gap-4">
        <PageHeader title={lead.client_name} subtitle={lead.site_address ?? undefined} />
        <Badge tone={statusTone[lead.status]} className="mt-1 shrink-0">{statusLabel[lead.status]}</Badge>
      </div>

      <Card className="mt-6 p-5">
        <div className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-4">
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400">Estimate</p>
            <p className="mt-1 text-sm font-medium text-slate-900 dark:text-slate-100">
              {lead.estimated_value !== null ? formatCurrency(lead.estimated_value) : "—"}
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400">Quoted</p>
            <p className="mt-1 text-sm font-medium text-slate-900 dark:text-slate-100">
              {lead.quote_amount !== null ? formatCurrency(lead.quote_amount) : "—"}
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400">Quote sent</p>
            <p className="mt-1 text-sm font-medium text-slate-900 dark:text-slate-100">{lead.quote_sent_date ?? "—"}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400">Next follow-up</p>
            <p className="mt-1 text-sm font-medium text-slate-900 dark:text-slate-100">{lead.follow_up_date ?? "—"}</p>
          </div>
        </div>

        {lead.description && (
          <p className="mt-4 border-t border-slate-100 pt-4 text-sm text-slate-700 dark:border-slate-800 dark:text-slate-300">
            {lead.description}
          </p>
        )}

        {lead.quote_accepted_at && (
          <p className="mt-3 text-sm text-emerald-700 dark:text-emerald-400">
            Quote accepted by {lead.quote_accepted_name} on {new Date(lead.quote_accepted_at).toLocaleDateString()}
          </p>
        )}
        {lead.status === "lost" && lead.lost_reason && (
          <p className="mt-3 text-sm text-red-600 dark:text-red-400">Lost: {lead.lost_reason}</p>
        )}

        <div className="mt-4 border-t border-slate-100 pt-4 dark:border-slate-800">
          <LeadEditForm lead={lead} />
        </div>
      </Card>

      <div className="mt-6">
        <LeadPipelineActions lead={lead} />
      </div>

      <div className="mt-8">
        <LeadFollowUps leadId={lead.id} followUps={followUps ?? []} authorName={authorName} />
      </div>

      <div className="mt-8">
        <LeadNotes leadId={lead.id} notes={notes ?? []} authorName={authorName} />
      </div>
    </div>
  );
}
