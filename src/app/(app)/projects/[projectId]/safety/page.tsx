import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ToolboxTalkGenerator } from "./toolbox-talk-generator";
import { NotifiableControl } from "./notifiable-control";
import { BackLink, PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Badge, BadgeTone } from "@/components/ui/badge";

const severityTone: Record<string, BadgeTone> = {
  info: "neutral",
  minor: "amber",
  major: "orange",
  incident: "red",
};

function formatDate(d: string) {
  return new Date(d).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

export default async function SafetyPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  const supabase = await createClient();

  const { data: project } = await supabase.from("projects").select("id, name").eq("id", projectId).single();
  if (!project) notFound();

  const { data: entries } = await supabase
    .from("diary_entries")
    .select("id, entry_date")
    .eq("project_id", projectId);
  const entryIds = (entries ?? []).map((e) => e.id);
  const dateFor = (entryId: string) => entries?.find((e) => e.id === entryId)?.entry_date;

  const { data: observations } = entryIds.length
    ? await supabase
        .from("safety_observations")
        .select(
          "id, diary_entry_id, severity, description, action_taken, notifiable, reported_at, report_reference, workcover_notified_at, workcover_reference"
        )
        .in("diary_entry_id", entryIds)
        .order("id", { ascending: false })
    : {
        data: [] as {
          id: string;
          diary_entry_id: string;
          severity: string;
          description: string;
          action_taken: string | null;
          notifiable: boolean;
          reported_at: string | null;
          report_reference: string | null;
          workcover_notified_at: string | null;
          workcover_reference: string | null;
        }[],
      };

  const notifiableCount = observations?.filter((o) => o.notifiable).length ?? 0;

  return (
    <div className="mx-auto max-w-2xl animate-fade-in">
      <BackLink href={`/projects/${projectId}`}>Back to project</BackLink>

      <div className="mt-3">
        <PageHeader
          title={`Safety — ${project.name}`}
          subtitle={
            notifiableCount > 0
              ? `${notifiableCount} notifiable incident${notifiableCount === 1 ? "" : "s"} flagged — notifiable incidents must be reported to WHSQ, and may separately need to be reported to WorkCover Queensland.`
              : undefined
          }
        />
      </div>

      <div className="mt-6">
        <ToolboxTalkGenerator projectId={projectId} />
      </div>

      <Card className="mt-6 divide-y divide-slate-100 overflow-hidden p-0 dark:divide-slate-800/80">
        {observations?.map((o) => (
          <div key={o.id} className="px-4 py-3.5">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm text-slate-900 dark:text-slate-100">{o.description}</p>
              <Badge tone={severityTone[o.severity]} className="shrink-0">{o.severity}</Badge>
            </div>
            {o.action_taken && (
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Action taken: {o.action_taken}</p>
            )}
            {dateFor(o.diary_entry_id) && (
              <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">{formatDate(dateFor(o.diary_entry_id)!)}</p>
            )}
            <NotifiableControl
              observationId={o.id}
              notifiable={o.notifiable}
              reportedAt={o.reported_at}
              reportReference={o.report_reference}
              workcoverNotifiedAt={o.workcover_notified_at}
              workcoverReference={o.workcover_reference}
            />
          </div>
        ))}
        {!observations?.length && (
          <p className="px-4 py-8 text-center text-sm text-slate-500 dark:text-slate-400">
            No safety observations logged yet — they&apos;ll show up here once AI extraction picks them up from site diary entries.
          </p>
        )}
      </Card>
    </div>
  );
}
