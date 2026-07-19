import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { BackLink, PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Badge, BadgeTone } from "@/components/ui/badge";
import { buttonStyles } from "@/components/ui/button-styles";

const statusTone: Record<string, BadgeTone> = {
  submitted: "amber",
  schedule_received: "blue",
  paid: "emerald",
  disputed: "red",
};

function formatCurrency(n: number) {
  return n.toLocaleString(undefined, { style: "currency", currency: "AUD" });
}

function daysUntil(dateStr: string): number {
  const diff = new Date(dateStr).getTime() - new Date().setHours(0, 0, 0, 0);
  return Math.round(diff / (1000 * 60 * 60 * 24));
}

export default async function PaymentClaimsPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  const supabase = await createClient();

  const { data: project } = await supabase.from("projects").select("id, name").eq("id", projectId).single();
  if (!project) notFound();

  const { data: claims } = await supabase
    .from("payment_claims")
    .select("id, claim_number, claim_date, amount_claimed, due_date, status")
    .eq("project_id", projectId)
    .order("claim_date", { ascending: false });

  return (
    <div className="mx-auto max-w-2xl animate-fade-in">
      <BackLink href={`/projects/${projectId}`}>Back to project</BackLink>

      <div className="mt-3">
        <PageHeader
          title={`Payment Claims — ${project.name}`}
          subtitle="Track progress/payment claims and BIF Act response due-dates. Record-keeping only — this doesn't file claims or move money."
          actions={
            <Link href={`/projects/${projectId}/payment-claims/new`} className={buttonStyles("primary", "md")}>
              + New claim
            </Link>
          }
        />
      </div>

      <Card className="mt-6 divide-y divide-slate-100 overflow-hidden p-0 dark:divide-slate-800/80">
        {claims?.map((c) => {
          const days = daysUntil(c.due_date);
          const isOverdue = (c.status === "submitted" || c.status === "schedule_received") && days < 0;
          return (
            <Link
              key={c.id}
              href={`/projects/${projectId}/payment-claims/${c.id}`}
              className="flex items-center justify-between gap-3 px-4 py-3.5 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/60"
            >
              <div className="min-w-0">
                <p className="truncate text-sm text-slate-900 dark:text-slate-100">
                  {c.claim_number ? `Claim ${c.claim_number}` : "Claim"} — {formatCurrency(c.amount_claimed)}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Claimed {c.claim_date} · Due {c.due_date}
                  {(c.status === "submitted" || c.status === "schedule_received") &&
                    (isOverdue ? ` · overdue by ${Math.abs(days)}d` : ` · ${days}d left`)}
                </p>
              </div>
              <Badge tone={isOverdue ? "red" : statusTone[c.status]} className="shrink-0">
                {isOverdue ? "overdue" : c.status.replace("_", " ")}
              </Badge>
            </Link>
          );
        })}
        {!claims?.length && (
          <p className="px-4 py-8 text-center text-sm text-slate-500 dark:text-slate-400">
            No payment claims recorded for this project yet.
          </p>
        )}
      </Card>
    </div>
  );
}
