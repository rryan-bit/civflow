import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { BackLink, PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Badge, BadgeTone } from "@/components/ui/badge";
import { buttonStyles } from "@/components/ui/button-styles";

const statusTone: Record<string, BadgeTone> = {
  open: "amber",
  notice_sent: "blue",
  granted: "emerald",
  rejected: "red",
};

const statusLabel: Record<string, string> = {
  open: "notice not sent",
  notice_sent: "notice sent",
  granted: "granted",
  rejected: "rejected",
};

const causeLabel: Record<string, string> = {
  weather: "Weather",
  latent_conditions: "Latent conditions",
  client_variation: "Client-caused delay",
  subcontractor_delay: "Subcontractor delay",
  authority_delay: "Authority/approval delay",
  other: "Other",
};

function formatDate(d: string | null) {
  if (!d) return null;
  return new Date(d).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

export default async function EotClaimsPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  const supabase = await createClient();

  const { data: project } = await supabase.from("projects").select("id, name").eq("id", projectId).single();
  if (!project) notFound();

  const { data: claims } = await supabase
    .from("eot_claims")
    .select("id, title, cause, status, days_claimed, notice_due_date")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false });

  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="mx-auto max-w-2xl animate-fade-in">
      <BackLink href={`/projects/${projectId}`}>Back to project</BackLink>

      <div className="mt-3">
        <PageHeader
          title={`Extension of Time claims — ${project.name}`}
          subtitle="Track delay causes, the notice deadline, and whether the client's been formally notified."
          actions={
            <Link href={`/projects/${projectId}/eot-claims/new`} className={buttonStyles("primary", "md")}>
              + New EOT claim
            </Link>
          }
        />
      </div>

      <Card className="mt-6 divide-y divide-slate-100 overflow-hidden p-0 dark:divide-slate-800/80">
        {claims?.map((c) => {
          const noticeOverdue = c.status === "open" && c.notice_due_date < today;
          return (
            <Link
              key={c.id}
              href={`/projects/${projectId}/eot-claims/${c.id}`}
              className="flex items-center justify-between gap-3 px-4 py-3.5 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/60"
            >
              <div className="min-w-0">
                <p className="truncate text-sm text-slate-900 dark:text-slate-100">{c.title}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {causeLabel[c.cause] ?? c.cause}
                  {c.days_claimed !== null && ` · ${c.days_claimed}d claimed`}
                  {c.status === "open" && ` · notice due ${formatDate(c.notice_due_date)}`}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-1.5">
                {noticeOverdue && <Badge tone="red">notice overdue</Badge>}
                <Badge tone={statusTone[c.status]}>{statusLabel[c.status]}</Badge>
              </div>
            </Link>
          );
        })}
        {!claims?.length && (
          <p className="px-4 py-8 text-center text-sm text-slate-500 dark:text-slate-400">
            No Extension of Time claims yet. Log one when a delay might warrant extra time under the contract.
          </p>
        )}
      </Card>
    </div>
  );
}
