import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { BackLink, PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Badge, BadgeTone } from "@/components/ui/badge";
import { buttonStyles } from "@/components/ui/button-styles";

const statusTone: Record<string, BadgeTone> = {
  draft: "neutral",
  awaiting_choice: "amber",
  chosen: "emerald",
};

const statusLabel: Record<string, string> = {
  draft: "draft",
  awaiting_choice: "awaiting client choice",
  chosen: "chosen",
};

function formatCurrency(n: number | null) {
  if (n === null) return null;
  return n.toLocaleString(undefined, { style: "currency", currency: "AUD", maximumFractionDigits: 0 });
}

function formatDate(d: string | null) {
  if (!d) return null;
  return new Date(d).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

export default async function SelectionsPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  const supabase = await createClient();

  const { data: project } = await supabase.from("projects").select("id, name").eq("id", projectId).single();
  if (!project) notFound();

  const { data: selections } = await supabase
    .from("selections")
    .select("id, category, status, allowance_amount, due_date, created_at")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false });

  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="mx-auto max-w-2xl animate-fade-in">
      <BackLink href={`/projects/${projectId}`}>Back to project</BackLink>

      <div className="mt-3">
        <PageHeader
          title={`Selections — ${project.name}`}
          subtitle="Fixtures, finishes and allowances the client needs to choose."
          actions={
            <Link href={`/projects/${projectId}/selections/new`} className={buttonStyles("primary", "md")}>
              + New selection
            </Link>
          }
        />
      </div>

      <Card className="mt-6 divide-y divide-slate-100 overflow-hidden p-0 dark:divide-slate-800/80">
        {selections?.map((s) => {
          const overdue = s.status === "awaiting_choice" && s.due_date !== null && s.due_date < today;
          return (
            <Link
              key={s.id}
              href={`/projects/${projectId}/selections/${s.id}`}
              className="flex items-center justify-between gap-3 px-4 py-3.5 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/60"
            >
              <div className="min-w-0">
                <p className="truncate text-sm text-slate-900 dark:text-slate-100">{s.category}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {s.allowance_amount !== null && `${formatCurrency(s.allowance_amount)} allowance`}
                  {s.allowance_amount !== null && s.due_date && " · "}
                  {s.due_date && `due ${formatDate(s.due_date)}`}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-1.5">
                {overdue && <Badge tone="red">overdue</Badge>}
                <Badge tone={statusTone[s.status]}>{statusLabel[s.status]}</Badge>
              </div>
            </Link>
          );
        })}
        {!selections?.length && (
          <p className="px-4 py-8 text-center text-sm text-slate-500 dark:text-slate-400">
            No selections yet. Add one for the first fixture or finish the client needs to choose.
          </p>
        )}
      </Card>
    </div>
  );
}
