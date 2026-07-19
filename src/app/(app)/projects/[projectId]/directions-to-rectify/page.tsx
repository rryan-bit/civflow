import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { BackLink, PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Badge, BadgeTone } from "@/components/ui/badge";
import { buttonStyles } from "@/components/ui/button-styles";

const statusTone: Record<string, BadgeTone> = {
  open: "amber",
  rectified: "emerald",
  disputed: "purple",
  overdue: "red",
};

function daysUntil(dateStr: string): number {
  const diff = new Date(dateStr).getTime() - new Date().setHours(0, 0, 0, 0);
  return Math.round(diff / (1000 * 60 * 60 * 24));
}

export default async function DirectionsToRectifyPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  const supabase = await createClient();

  const { data: project } = await supabase.from("projects").select("id, name").eq("id", projectId).single();
  if (!project) notFound();

  const { data: directions } = await supabase
    .from("directions_to_rectify")
    .select("id, description, issued_date, due_date, status")
    .eq("project_id", projectId)
    .order("due_date", { ascending: true });

  return (
    <div className="mx-auto max-w-2xl animate-fade-in">
      <BackLink href={`/projects/${projectId}`}>Back to project</BackLink>

      <div className="mt-3">
        <PageHeader
          title={`Directions to Rectify — ${project.name}`}
          subtitle="QBCC notices to fix defective or incomplete work — the statutory clock is usually 35 days from issue."
          actions={
            <Link href={`/projects/${projectId}/directions-to-rectify/new`} className={buttonStyles("primary", "md")}>
              + New DTR
            </Link>
          }
        />
      </div>

      <Card className="mt-6 divide-y divide-slate-100 overflow-hidden p-0 dark:divide-slate-800/80">
        {directions?.map((d) => {
          const days = daysUntil(d.due_date);
          const isOverdue = d.status === "open" && days < 0;
          return (
            <Link
              key={d.id}
              href={`/projects/${projectId}/directions-to-rectify/${d.id}`}
              className="flex items-center justify-between gap-3 px-4 py-3.5 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/60"
            >
              <div className="min-w-0">
                <p className="truncate text-sm text-slate-900 dark:text-slate-100">{d.description}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Due {d.due_date}
                  {d.status === "open" && (isOverdue ? ` · overdue by ${Math.abs(days)}d` : ` · ${days}d left`)}
                </p>
              </div>
              <Badge tone={isOverdue ? "red" : statusTone[d.status]} className="shrink-0">
                {isOverdue ? "overdue" : d.status}
              </Badge>
            </Link>
          );
        })}
        {!directions?.length && (
          <p className="px-4 py-8 text-center text-sm text-slate-500 dark:text-slate-400">
            No Directions to Rectify recorded for this project.
          </p>
        )}
      </Card>
    </div>
  );
}
