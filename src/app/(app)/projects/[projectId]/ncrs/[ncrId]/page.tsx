import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { NcrActions } from "./ncr-actions";
import { BackLink } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Badge, BadgeTone } from "@/components/ui/badge";
import { AssigneeSelect } from "@/components/assignee-select";

const statusTone: Record<string, BadgeTone> = {
  open: "red",
  closed: "emerald",
  disputed: "purple",
};

export default async function NcrDetailPage({
  params,
}: {
  params: Promise<{ projectId: string; ncrId: string }>;
}) {
  const { projectId, ncrId } = await params;
  const supabase = await createClient();

  const { data: ncr } = await supabase
    .from("non_conformance_reports")
    .select("*")
    .eq("id", ncrId)
    .eq("project_id", projectId)
    .single();
  if (!ncr) notFound();

  return (
    <div className="mx-auto max-w-2xl animate-fade-in">
      <BackLink href={`/projects/${projectId}/ncrs`}>Back to NCRs</BackLink>

      <div className="mt-3 flex items-start justify-between gap-4">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">Non-Conformance Report</h1>
        <Badge tone={statusTone[ncr.status]} className="shrink-0">{ncr.status}</Badge>
      </div>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
        {ncr.trade ? `${ncr.trade} · ` : ""}Raised {ncr.raised_date}
        {ncr.closed_date && ` · closed ${ncr.closed_date}`}
      </p>

      <Card className="mt-6 p-5">
        <h2 className="text-sm font-medium text-slate-700 dark:text-slate-300">Description</h2>
        <p className="mt-1.5 whitespace-pre-wrap text-sm text-slate-900 dark:text-slate-100">{ncr.description}</p>
      </Card>

      {ncr.corrective_action && (
        <Card className="mt-4 p-5">
          <h2 className="text-sm font-medium text-slate-700 dark:text-slate-300">Corrective action</h2>
          <p className="mt-1.5 whitespace-pre-wrap text-sm text-slate-900 dark:text-slate-100">{ncr.corrective_action}</p>
        </Card>
      )}

      <Card className="mt-4 p-5">
        <AssigneeSelect table="non_conformance_reports" recordId={ncr.id} currentAssignee={ncr.assigned_to} />
      </Card>

      <div className="mt-6">
        <NcrActions ncr={ncr} />
      </div>
    </div>
  );
}
