import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { BackLink, PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Badge, BadgeTone } from "@/components/ui/badge";
import { buttonStyles } from "@/components/ui/button-styles";

const subStatusTone: Record<string, BadgeTone> = {
  quoting: "amber",
  awarded: "blue",
  active: "emerald",
  complete: "slate",
  terminated: "red",
};

function formatCurrency(n: number) {
  return n.toLocaleString(undefined, { style: "currency", currency: "AUD", maximumFractionDigits: 0 });
}

function daysUntil(dateStr: string | null): number | null {
  if (!dateStr) return null;
  const diff = new Date(dateStr).getTime() - new Date().setHours(0, 0, 0, 0);
  return Math.round(diff / (1000 * 60 * 60 * 24));
}

function ExpiryBadge({ label, dateStr }: { label: string; dateStr: string | null }) {
  const days = daysUntil(dateStr);
  if (days === null) return <Badge>{label}: not set</Badge>;
  if (days < 0) return <Badge tone="red">{label} expired</Badge>;
  if (days <= 30) return <Badge tone="amber">{label}: {days}d left</Badge>;
  return <Badge tone="emerald">{label}: OK</Badge>;
}

export default async function SubcontractorsPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  const supabase = await createClient();

  const { data: project } = await supabase.from("projects").select("id, name").eq("id", projectId).single();
  if (!project) notFound();

  const { data: subcontractors } = await supabase
    .from("subcontractors")
    .select("id, company_name, trade, licence_expiry, insurance_expiry, status, contract_value")
    .eq("project_id", projectId)
    .order("company_name", { ascending: true });

  return (
    <div className="mx-auto max-w-2xl animate-fade-in">
      <BackLink href={`/projects/${projectId}`}>Back to project</BackLink>

      <div className="mt-3">
        <PageHeader
          title={`Subcontractors — ${project.name}`}
          subtitle="Register of subcontractors on this project, with licence and insurance expiry tracking."
          actions={
            <Link href={`/projects/${projectId}/subcontractors/new`} className={buttonStyles("primary", "md")}>
              + Add subcontractor
            </Link>
          }
        />
      </div>

      <Card className="mt-6 divide-y divide-slate-100 overflow-hidden p-0 dark:divide-slate-800/80">
        {subcontractors?.map((s) => (
          <Link
            key={s.id}
            href={`/projects/${projectId}/subcontractors/${s.id}`}
            className="flex items-center justify-between gap-3 px-4 py-3.5 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/60"
          >
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <p className="truncate text-sm text-slate-900 dark:text-slate-100">{s.company_name}</p>
                <Badge tone={subStatusTone[s.status]} className="shrink-0">{s.status}</Badge>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {s.trade ?? "Trade not set"}
                {s.contract_value != null && ` · ${formatCurrency(s.contract_value)}`}
              </p>
            </div>
            <div className="flex shrink-0 flex-col items-end gap-1">
              <ExpiryBadge label="Licence" dateStr={s.licence_expiry} />
              <ExpiryBadge label="Insurance" dateStr={s.insurance_expiry} />
            </div>
          </Link>
        ))}
        {!subcontractors?.length && (
          <p className="px-4 py-8 text-center text-sm text-slate-500 dark:text-slate-400">
            No subcontractors recorded for this project yet.
          </p>
        )}
      </Card>
    </div>
  );
}
