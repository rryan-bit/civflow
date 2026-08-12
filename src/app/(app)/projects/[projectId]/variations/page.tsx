import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { BackLink, PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Badge, BadgeTone } from "@/components/ui/badge";
import { buttonStyles } from "@/components/ui/button-styles";
import { EmptyState, EmptyIcons } from "@/components/ui/empty-state";

const statusTone: Record<string, BadgeTone> = {
  draft: "neutral",
  submitted: "amber",
  approved: "emerald",
  rejected: "red",
};

function formatCurrency(n: number | null) {
  if (n === null) return null;
  return n.toLocaleString(undefined, { style: "currency", currency: "AUD", maximumFractionDigits: 0 });
}

export default async function VariationsPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  const supabase = await createClient();

  const { data: project } = await supabase.from("projects").select("id, name").eq("id", projectId).single();
  if (!project) notFound();

  const { data: variations } = await supabase
    .from("variations")
    .select("id, title, status, cost_impact, time_impact_days, created_at, work_started, client_approved_at")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false });

  return (
    <div className="mx-auto max-w-2xl animate-fade-in">
      <BackLink href={`/projects/${projectId}`}>Back to project</BackLink>

      <div className="mt-3">
        <PageHeader
          title={`Variations — ${project.name}`}
          actions={
            <Link href={`/projects/${projectId}/variations/new`} className={buttonStyles("primary", "md")}>
              + New variation
            </Link>
          }
        />
      </div>

      <Card className="mt-6 divide-y divide-slate-100 overflow-hidden p-0 dark:divide-slate-800/80">
        {variations?.map((v) => (
          <Link
            key={v.id}
            href={`/projects/${projectId}/variations/${v.id}`}
            className="flex items-center justify-between gap-3 px-4 py-3.5 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/60"
          >
            <div className="min-w-0">
              <p className="truncate text-sm text-slate-900 dark:text-slate-100">{v.title}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {v.cost_impact !== null && formatCurrency(v.cost_impact)}
                {v.cost_impact !== null && v.time_impact_days !== null && " · "}
                {v.time_impact_days !== null && `${v.time_impact_days} day${v.time_impact_days === 1 ? "" : "s"}`}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-1.5">
              {v.work_started && !v.client_approved_at && <Badge tone="red">no client sign-off</Badge>}
              {v.client_approved_at && <Badge tone="emerald">client signed off</Badge>}
              <Badge tone={statusTone[v.status]}>{v.status}</Badge>
            </div>
          </Link>
        ))}
        {!variations?.length && (
          <EmptyState icon={EmptyIcons.edit} title="No variations yet on this project." className="px-4 py-8" />
        )}
      </Card>
    </div>
  );
}
