import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { BackLink, PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Badge, BadgeTone } from "@/components/ui/badge";
import { buttonStyles } from "@/components/ui/button-styles";

const statusTone: Record<string, BadgeTone> = {
  open: "amber",
  answered: "neutral",
  closed: "emerald",
};

export default async function RfisPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  const supabase = await createClient();

  const { data: project } = await supabase.from("projects").select("id, name").eq("id", projectId).single();
  if (!project) notFound();

  const { data: rfis } = await supabase
    .from("rfis")
    .select("id, subject, status, due_date, created_at")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false });

  return (
    <div className="mx-auto max-w-2xl animate-fade-in">
      <BackLink href={`/projects/${projectId}`}>Back to project</BackLink>

      <div className="mt-3">
        <PageHeader
          title={`RFIs — ${project.name}`}
          actions={
            <Link href={`/projects/${projectId}/rfis/new`} className={buttonStyles("primary", "md")}>
              + New RFI
            </Link>
          }
        />
      </div>

      <Card className="mt-6 divide-y divide-slate-100 overflow-hidden p-0 dark:divide-slate-800/80">
        {rfis?.map((rfi) => (
          <Link
            key={rfi.id}
            href={`/projects/${projectId}/rfis/${rfi.id}`}
            className="flex items-center justify-between gap-3 px-4 py-3.5 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/60"
          >
            <div className="min-w-0">
              <p className="truncate text-sm text-slate-900 dark:text-slate-100">{rfi.subject}</p>
              {rfi.due_date && <p className="text-xs text-slate-500 dark:text-slate-400">Due {rfi.due_date}</p>}
            </div>
            <Badge tone={statusTone[rfi.status]}>{rfi.status}</Badge>
          </Link>
        ))}
        {!rfis?.length && (
          <p className="px-4 py-8 text-center text-sm text-slate-500 dark:text-slate-400">No RFIs yet on this project.</p>
        )}
      </Card>
    </div>
  );
}
