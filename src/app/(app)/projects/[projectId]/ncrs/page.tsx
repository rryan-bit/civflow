import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { BackLink, PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Badge, BadgeTone } from "@/components/ui/badge";
import { buttonStyles } from "@/components/ui/button-styles";
import { EmptyState, EmptyIcons } from "@/components/ui/empty-state";

const statusTone: Record<string, BadgeTone> = {
  open: "red",
  closed: "emerald",
  disputed: "purple",
};

export default async function NcrsPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  const supabase = await createClient();

  const { data: project } = await supabase.from("projects").select("id, name").eq("id", projectId).single();
  if (!project) notFound();

  const { data: ncrs } = await supabase
    .from("non_conformance_reports")
    .select("id, description, trade, raised_date, status")
    .eq("project_id", projectId)
    .order("raised_date", { ascending: false });

  return (
    <div className="mx-auto max-w-2xl animate-fade-in">
      <BackLink href={`/projects/${projectId}`}>Back to project</BackLink>

      <div className="mt-3">
        <PageHeader
          title={`Non-Conformance Reports — ${project.name}`}
          subtitle="Defective or non-compliant work identified during quality inspections."
          actions={
            <Link href={`/projects/${projectId}/ncrs/new`} className={buttonStyles("primary", "md")}>
              + New NCR
            </Link>
          }
        />
      </div>

      <Card className="mt-6 divide-y divide-slate-100 overflow-hidden p-0 dark:divide-slate-800/80">
        {ncrs?.map((n) => (
          <Link
            key={n.id}
            href={`/projects/${projectId}/ncrs/${n.id}`}
            className="flex items-center justify-between gap-3 px-4 py-3.5 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/60"
          >
            <div className="min-w-0">
              <p className="truncate text-sm text-slate-900 dark:text-slate-100">{n.description}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {n.trade ? `${n.trade} · ` : ""}Raised {n.raised_date}
              </p>
            </div>
            <Badge tone={statusTone[n.status]} className="shrink-0">{n.status}</Badge>
          </Link>
        ))}
        {!ncrs?.length && (
          <EmptyState icon={EmptyIcons.alert} title="No non-conformance reports recorded for this project yet." className="px-4 py-8" />
        )}
      </Card>
    </div>
  );
}
