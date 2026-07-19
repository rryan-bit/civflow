import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PcDatesForm } from "./pc-dates-form";
import { DefectsPanel } from "./defects-panel";
import { HandoverChecklist } from "./handover-checklist";
import { BackLink, PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

function daysUntil(dateStr: string | null): number | null {
  if (!dateStr) return null;
  const diff = new Date(dateStr).getTime() - new Date().setHours(0, 0, 0, 0);
  return Math.round(diff / (1000 * 60 * 60 * 24));
}

export default async function PracticalCompletionPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  const supabase = await createClient();

  const { data: project } = await supabase
    .from("projects")
    .select("id, name, practical_completion_date, defects_liability_end_date")
    .eq("id", projectId)
    .single();
  if (!project) notFound();

  const [{ data: defects }, { data: handoverItems }, { data: subcontractors }] = await Promise.all([
    supabase
      .from("defects")
      .select("id, description, location, status, defect_type, noted_date, due_date, rectified_date, subcontractor_id")
      .eq("project_id", projectId)
      .order("noted_date", { ascending: false }),
    supabase
      .from("handover_items")
      .select("id, label, category, completed, completed_date")
      .eq("project_id", projectId)
      .order("sort_order", { ascending: true }),
    supabase.from("subcontractors").select("id, company_name").eq("project_id", projectId).order("company_name", { ascending: true }),
  ]);

  const dlpDays = daysUntil(project.defects_liability_end_date);
  const openDefects = defects?.filter((d) => d.status === "open").length ?? 0;

  return (
    <div className="mx-auto max-w-2xl animate-fade-in">
      <BackLink href={`/projects/${projectId}`}>Back to project</BackLink>

      <div className="mt-3">
        <PageHeader
          title={`Practical Completion — ${project.name}`}
          subtitle="Defects at handover, the defects liability period, and the close-out checklist."
        />
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {project.practical_completion_date && <Badge tone="blue">PC: {project.practical_completion_date}</Badge>}
        {project.defects_liability_end_date && (
          <Badge tone={dlpDays !== null && dlpDays < 0 ? "neutral" : dlpDays !== null && dlpDays <= 30 ? "amber" : "emerald"}>
            {dlpDays !== null && dlpDays < 0
              ? `DLP ended ${project.defects_liability_end_date}`
              : `DLP ends ${project.defects_liability_end_date}${dlpDays !== null ? ` (${dlpDays}d)` : ""}`}
          </Badge>
        )}
        {openDefects > 0 && <Badge tone="red">{openDefects} open defect{openDefects === 1 ? "" : "s"}</Badge>}
      </div>

      <Card className="mt-6 p-5">
        <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Key dates</h2>
        <PcDatesForm
          projectId={projectId}
          practicalCompletionDate={project.practical_completion_date}
          defectsLiabilityEndDate={project.defects_liability_end_date}
        />
      </Card>

      <div className="mt-6">
        <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Defects</h2>
        <DefectsPanel projectId={projectId} defects={defects ?? []} subcontractors={subcontractors ?? []} />
      </div>

      <div className="mt-6">
        <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Handover checklist</h2>
        <HandoverChecklist projectId={projectId} items={handoverItems ?? []} />
      </div>
    </div>
  );
}
