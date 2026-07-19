import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { MilestonesList } from "./milestones-list";
import { ScheduleGantt } from "./schedule-gantt";
import { SequencingPanel } from "./sequencing-panel";
import { BackLink, PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";

export default async function MilestonesPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  const supabase = await createClient();

  const { data: project } = await supabase.from("projects").select("id, name, start_date").eq("id", projectId).single();
  if (!project) notFound();

  const { data: milestones } = await supabase
    .from("milestones")
    .select("id, name, target_date, status, notes, actual_date, delay_reason, duration_days, created_at")
    .eq("project_id", projectId)
    .order("target_date", { ascending: true, nullsFirst: false });

  const milestoneIds = (milestones ?? []).map((m) => m.id);
  const { data: dependencyRows } = milestoneIds.length
    ? await supabase.from("milestone_dependencies").select("predecessor_id, successor_id").in("successor_id", milestoneIds)
    : { data: [] as { predecessor_id: string; successor_id: string }[] };

  const edges = (dependencyRows ?? []).map((d) => ({ predecessorId: d.predecessor_id, successorId: d.successor_id }));

  return (
    <div className="mx-auto max-w-2xl animate-fade-in">
      <BackLink href={`/projects/${projectId}`}>Back to project</BackLink>

      <div className="mt-3">
        <PageHeader title={`Milestones — ${project.name}`} />
      </div>

      {(milestones?.length ?? 0) > 0 && (
        <Card className="mt-6 p-5">
          <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Schedule</h2>
          <div className="mt-3">
            <ScheduleGantt milestones={milestones ?? []} edges={edges} projectStartDate={project.start_date} />
          </div>
        </Card>
      )}

      <div className="mt-4">
        <SequencingPanel milestones={milestones ?? []} edges={edges} />
      </div>

      <div className="mt-6">
        <MilestonesList projectId={projectId} milestones={milestones ?? []} />
      </div>
    </div>
  );
}
