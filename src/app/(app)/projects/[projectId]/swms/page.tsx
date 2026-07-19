import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { BackLink, PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Badge, BadgeTone } from "@/components/ui/badge";
import { buttonStyles } from "@/components/ui/button-styles";

const statusTone: Record<string, BadgeTone> = {
  current: "emerald",
  review_due: "amber",
  expired: "red",
  superseded: "neutral",
};

export default async function SwmsPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  const supabase = await createClient();

  const { data: project } = await supabase.from("projects").select("id, name").eq("id", projectId).single();
  if (!project) notFound();

  const { data: swmsRecords } = await supabase
    .from("swms")
    .select("id, title, status, review_due_date, subcontractor_id")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false });

  const subIds = [...new Set((swmsRecords ?? []).map((s) => s.subcontractor_id).filter((id): id is string => Boolean(id)))];
  const { data: subs } = subIds.length
    ? await supabase.from("subcontractors").select("id, company_name").in("id", subIds)
    : { data: [] as { id: string; company_name: string }[] };
  const subName = (id: string | null) => (id && subs?.find((s) => s.id === id)?.company_name) || "General / company";

  return (
    <div className="mx-auto max-w-2xl animate-fade-in">
      <BackLink href={`/projects/${projectId}`}>Back to project</BackLink>

      <div className="mt-3">
        <PageHeader
          title={`SWMS — ${project.name}`}
          subtitle="Safe Work Method Statements for high-risk construction work must be prepared and reviewed before work begins."
          actions={
            <Link href={`/projects/${projectId}/swms/new`} className={buttonStyles("primary", "md")}>
              + Add SWMS
            </Link>
          }
        />
      </div>

      <Card className="mt-6 divide-y divide-slate-100 overflow-hidden p-0 dark:divide-slate-800/80">
        {swmsRecords?.map((s) => (
          <Link
            key={s.id}
            href={`/projects/${projectId}/swms/${s.id}`}
            className="flex items-center justify-between gap-3 px-4 py-3.5 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/60"
          >
            <div className="min-w-0">
              <p className="truncate text-sm text-slate-900 dark:text-slate-100">{s.title}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {subName(s.subcontractor_id)}
                {s.review_due_date && ` · review due ${s.review_due_date}`}
              </p>
            </div>
            <Badge tone={statusTone[s.status]} className="shrink-0">{s.status.replace("_", " ")}</Badge>
          </Link>
        ))}
        {!swmsRecords?.length && (
          <p className="px-4 py-8 text-center text-sm text-slate-500 dark:text-slate-400">
            No SWMS recorded for this project yet.
          </p>
        )}
      </Card>
    </div>
  );
}
