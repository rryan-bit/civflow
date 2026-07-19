import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { RfiActions } from "./rfi-actions";
import { BackLink } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Badge, BadgeTone } from "@/components/ui/badge";
import { AssigneeSelect } from "@/components/assignee-select";

const statusTone: Record<string, BadgeTone> = {
  open: "amber",
  answered: "neutral",
  closed: "emerald",
};

function formatDate(d: string | null) {
  if (!d) return null;
  return new Date(d).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

export default async function RfiDetailPage({
  params,
}: {
  params: Promise<{ projectId: string; rfiId: string }>;
}) {
  const { projectId, rfiId } = await params;
  const supabase = await createClient();

  const { data: rfi } = await supabase.from("rfis").select("*").eq("id", rfiId).eq("project_id", projectId).single();
  if (!rfi) notFound();

  const actorIds = [rfi.raised_by, rfi.answered_by].filter((id): id is string => Boolean(id));
  const { data: actors } = actorIds.length
    ? await supabase.from("profiles").select("id, full_name").in("id", actorIds)
    : { data: [] as { id: string; full_name: string | null }[] };
  const nameFor = (id: string | null) => (id ? actors?.find((a) => a.id === id)?.full_name ?? "Someone" : null);

  return (
    <div className="mx-auto max-w-2xl animate-fade-in">
      <BackLink href={`/projects/${projectId}/rfis`}>Back to RFIs</BackLink>

      <div className="mt-3 flex items-start justify-between gap-4">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">{rfi.subject}</h1>
        <Badge tone={statusTone[rfi.status]} className="shrink-0">{rfi.status}</Badge>
      </div>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
        Raised by {nameFor(rfi.raised_by) ?? "Unknown"} · {formatDate(rfi.created_at)}
        {rfi.due_date && ` · Due ${formatDate(rfi.due_date)}`}
      </p>

      <Card className="mt-6 p-5">
        <h2 className="text-sm font-medium text-slate-700 dark:text-slate-300">Question</h2>
        <p className="mt-1.5 whitespace-pre-wrap text-sm text-slate-900 dark:text-slate-100">{rfi.question}</p>
      </Card>

      {rfi.answer && (
        <Card className="mt-4 animate-slide-up border-emerald-200/60 bg-emerald-50/40 p-5 dark:border-emerald-800/40 dark:bg-emerald-950/20">
          <h2 className="text-sm font-medium text-slate-700 dark:text-slate-300">Answer</h2>
          <p className="mt-1.5 whitespace-pre-wrap text-sm text-slate-900 dark:text-slate-100">{rfi.answer}</p>
          <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
            Answered by {nameFor(rfi.answered_by) ?? "Unknown"} · {formatDate(rfi.answered_at)}
          </p>
        </Card>
      )}

      <Card className="mt-4 p-5">
        <AssigneeSelect table="rfis" recordId={rfi.id} currentAssignee={rfi.assigned_to} />
      </Card>

      <div className="mt-6">
        <RfiActions rfi={rfi} />
      </div>
    </div>
  );
}
