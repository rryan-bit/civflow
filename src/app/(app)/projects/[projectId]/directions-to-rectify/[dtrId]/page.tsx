import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DtrActions } from "./dtr-actions";
import { BackLink } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Badge, BadgeTone } from "@/components/ui/badge";
import { AssigneeSelect } from "@/components/assignee-select";

const statusTone: Record<string, BadgeTone> = {
  open: "amber",
  rectified: "emerald",
  disputed: "purple",
  overdue: "red",
};

function formatDate(d: string) {
  return new Date(d).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

function daysUntil(dateStr: string): number {
  const diff = new Date(dateStr).getTime() - new Date().setHours(0, 0, 0, 0);
  return Math.round(diff / (1000 * 60 * 60 * 24));
}

export default async function DtrDetailPage({
  params,
}: {
  params: Promise<{ projectId: string; dtrId: string }>;
}) {
  const { projectId, dtrId } = await params;
  const supabase = await createClient();

  const { data: dtr } = await supabase
    .from("directions_to_rectify")
    .select("*")
    .eq("id", dtrId)
    .eq("project_id", projectId)
    .single();
  if (!dtr) notFound();

  const { data: creator } = dtr.created_by
    ? await supabase.from("profiles").select("full_name").eq("id", dtr.created_by).single()
    : { data: null };

  const days = daysUntil(dtr.due_date);
  const isOverdue = dtr.status === "open" && days < 0;

  return (
    <div className="mx-auto max-w-2xl animate-fade-in">
      <BackLink href={`/projects/${projectId}/directions-to-rectify`}>Back to Directions to Rectify</BackLink>

      <div className="mt-3 flex items-start justify-between gap-4">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">Direction to Rectify</h1>
        <Badge tone={isOverdue ? "red" : statusTone[dtr.status]} className="shrink-0">
          {isOverdue ? "overdue" : dtr.status}
        </Badge>
      </div>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
        Issued {formatDate(dtr.issued_date)} by {creator?.full_name ?? "Unknown"} · Due {formatDate(dtr.due_date)}
        {dtr.status === "open" && (isOverdue ? ` · overdue by ${Math.abs(days)}d` : ` · ${days}d remaining`)}
      </p>

      <Card className="mt-6 p-5">
        <h2 className="text-sm font-medium text-slate-700 dark:text-slate-300">Description</h2>
        <p className="mt-1.5 whitespace-pre-wrap text-sm text-slate-900 dark:text-slate-100">{dtr.description}</p>
      </Card>

      {dtr.notes && (
        <Card className="mt-4 p-5">
          <h2 className="text-sm font-medium text-slate-700 dark:text-slate-300">Notes</h2>
          <p className="mt-1.5 whitespace-pre-wrap text-sm text-slate-900 dark:text-slate-100">{dtr.notes}</p>
        </Card>
      )}

      <Card className="mt-4 p-5">
        <AssigneeSelect table="directions_to_rectify" recordId={dtr.id} currentAssignee={dtr.assigned_to} />
      </Card>

      <div className="mt-6">
        <DtrActions dtr={dtr} />
      </div>
    </div>
  );
}
