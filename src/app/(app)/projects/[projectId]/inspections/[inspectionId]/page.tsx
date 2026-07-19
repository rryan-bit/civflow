import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { InspectionActions } from "./inspection-actions";
import { BackLink } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Badge, BadgeTone } from "@/components/ui/badge";

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

export default async function InspectionDetailPage({
  params,
}: {
  params: Promise<{ projectId: string; inspectionId: string }>;
}) {
  const { projectId, inspectionId } = await params;
  const supabase = await createClient();

  const { data: inspection } = await supabase
    .from("inspections")
    .select("*")
    .eq("id", inspectionId)
    .eq("project_id", projectId)
    .single();
  if (!inspection) notFound();

  const { data: ncrs } = await supabase
    .from("non_conformance_reports")
    .select("id, description, status")
    .eq("inspection_id", inspectionId)
    .order("created_at", { ascending: false });

  return (
    <div className="mx-auto max-w-2xl animate-fade-in">
      <BackLink href={`/projects/${projectId}/inspections`}>Back to Inspections</BackLink>

      <div className="mt-3 flex items-start justify-between gap-4">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">{inspection.work_area}</h1>
        <Badge tone={statusTone[inspection.status]} className="shrink-0">{inspection.status.replace(/_/g, " ")}</Badge>
      </div>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
        {typeLabel[inspection.inspection_type]}
        {inspection.scheduled_date && ` · scheduled ${inspection.scheduled_date}`}
        {inspection.inspected_date && ` · inspected ${inspection.inspected_date}`}
        {inspection.inspector_name && ` by ${inspection.inspector_name}`}
      </p>

      {inspection.notes && (
        <Card className="mt-6 p-5">
          <h2 className="text-sm font-medium text-slate-700 dark:text-slate-300">Notes</h2>
          <p className="mt-1.5 whitespace-pre-wrap text-sm text-slate-900 dark:text-slate-100">{inspection.notes}</p>
        </Card>
      )}

      <div className="mt-6">
        <InspectionActions inspection={inspection} />
      </div>

      {ncrs && ncrs.length > 0 && (
        <div className="mt-6">
          <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Linked NCRs</h2>
          <Card className="mt-2 divide-y divide-slate-100 overflow-hidden p-0 dark:divide-slate-800/80">
            {ncrs.map((n) => (
              <Link
                key={n.id}
                href={`/projects/${projectId}/ncrs/${n.id}`}
                className="flex items-center justify-between gap-3 px-4 py-3 text-sm transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/60"
              >
                <span className="min-w-0 truncate text-slate-900 dark:text-slate-100">{n.description}</span>
                <Badge tone={n.status === "open" ? "red" : "emerald"} className="shrink-0">{n.status}</Badge>
              </Link>
            ))}
          </Card>
        </div>
      )}
    </div>
  );
}
