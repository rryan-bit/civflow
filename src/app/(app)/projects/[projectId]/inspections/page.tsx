import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { BackLink, PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Badge, BadgeTone } from "@/components/ui/badge";
import { buttonStyles } from "@/components/ui/button-styles";

const statusTone: Record<string, BadgeTone> = {
  pending: "amber",
  passed: "emerald",
  passed_with_notes: "blue",
  failed: "red",
};

const typeLabel: Record<string, string> = {
  hold_point: "Hold point",
  witness_point: "Witness point",
  final: "Final inspection",
};

export default async function InspectionsPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  const supabase = await createClient();

  const { data: project } = await supabase.from("projects").select("id, name").eq("id", projectId).single();
  if (!project) notFound();

  const { data: inspections } = await supabase
    .from("inspections")
    .select("id, work_area, inspection_type, status, scheduled_date")
    .eq("project_id", projectId)
    .order("scheduled_date", { ascending: true, nullsFirst: false });

  return (
    <div className="mx-auto max-w-2xl animate-fade-in">
      <BackLink href={`/projects/${projectId}`}>Back to project</BackLink>

      <div className="mt-3">
        <PageHeader
          title={`Inspections — ${project.name}`}
          subtitle="ITP hold points, witness points and final inspections for this project."
          actions={
            <Link href={`/projects/${projectId}/inspections/new`} className={buttonStyles("primary", "md")}>
              + New inspection
            </Link>
          }
        />
      </div>

      <Card className="mt-6 divide-y divide-slate-100 overflow-hidden p-0 dark:divide-slate-800/80">
        {inspections?.map((i) => (
          <Link
            key={i.id}
            href={`/projects/${projectId}/inspections/${i.id}`}
            className="flex items-center justify-between gap-3 px-4 py-3.5 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/60"
          >
            <div className="min-w-0">
              <p className="truncate text-sm text-slate-900 dark:text-slate-100">{i.work_area}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {typeLabel[i.inspection_type]}
                {i.scheduled_date && ` · scheduled ${i.scheduled_date}`}
              </p>
            </div>
            <Badge tone={statusTone[i.status]} className="shrink-0">{i.status.replace(/_/g, " ")}</Badge>
          </Link>
        ))}
        {!inspections?.length && (
          <p className="px-4 py-8 text-center text-sm text-slate-500 dark:text-slate-400">
            No inspections recorded for this project yet.
          </p>
        )}
      </Card>
    </div>
  );
}
