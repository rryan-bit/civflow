import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SwmsActions } from "./swms-actions";
import { BackLink } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Badge, BadgeTone } from "@/components/ui/badge";

const statusTone: Record<string, BadgeTone> = {
  current: "emerald",
  review_due: "amber",
  expired: "red",
  superseded: "neutral",
};

export default async function SwmsDetailPage({
  params,
}: {
  params: Promise<{ projectId: string; swmsId: string }>;
}) {
  const { projectId, swmsId } = await params;
  const supabase = await createClient();

  const { data: swms } = await supabase.from("swms").select("*").eq("id", swmsId).eq("project_id", projectId).single();
  if (!swms) notFound();

  const { data: subcontractor } = swms.subcontractor_id
    ? await supabase.from("subcontractors").select("company_name").eq("id", swms.subcontractor_id).single()
    : { data: null };

  return (
    <div className="mx-auto max-w-2xl animate-fade-in">
      <BackLink href={`/projects/${projectId}/swms`}>Back to SWMS</BackLink>

      <div className="mt-3 flex items-start justify-between gap-4">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">{swms.title}</h1>
        <Badge tone={statusTone[swms.status]} className="shrink-0">{swms.status.replace("_", " ")}</Badge>
      </div>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
        {subcontractor?.company_name ?? "General / company"}
        {swms.received_date && ` · received ${swms.received_date}`}
        {swms.review_due_date && ` · review due ${swms.review_due_date}`}
      </p>

      {(swms.document_reference || swms.notes) && (
        <Card className="mt-6 p-5 space-y-3">
          {swms.document_reference && (
            <div>
              <h2 className="text-sm font-medium text-slate-700 dark:text-slate-300">Document reference</h2>
              <p className="mt-1 text-sm text-slate-900 dark:text-slate-100">{swms.document_reference}</p>
            </div>
          )}
          {swms.notes && (
            <div>
              <h2 className="text-sm font-medium text-slate-700 dark:text-slate-300">Notes</h2>
              <p className="mt-1 whitespace-pre-wrap text-sm text-slate-900 dark:text-slate-100">{swms.notes}</p>
            </div>
          )}
        </Card>
      )}

      <div className="mt-6">
        <SwmsActions swms={swms} />
      </div>
    </div>
  );
}
