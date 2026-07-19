import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getPortfolioRows } from "@/lib/portfolio-report";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Badge, BadgeTone } from "@/components/ui/badge";

const statusTone: Record<string, BadgeTone> = {
  active: "emerald",
  lead: "neutral",
  on_hold: "amber",
  complete: "blue",
  cancelled: "red",
};

function formatCurrency(n: number | null) {
  if (n === null) return "—";
  return n.toLocaleString(undefined, { style: "currency", currency: "AUD", maximumFractionDigits: 0 });
}

export default async function ReportsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase.from("profiles").select("company_id").eq("id", user.id).single();
  if (!profile?.company_id) redirect("/onboarding");

  const rows = await getPortfolioRows(supabase, profile.company_id);

  const totals = rows.reduce(
    (acc, r) => {
      acc.revised += r.revisedContractValue;
      acc.claimed += r.totalClaimed;
      acc.alerts += r.complianceAlertCount;
      return acc;
    },
    { revised: 0, claimed: 0, alerts: 0 },
  );

  return (
    <div className="mx-auto max-w-4xl animate-fade-in">
      <PageHeader
        title="Portfolio report"
        subtitle="Every project's contract value, billing progress, schedule, and compliance status in one view."
        actions={
          <a
            href="/api/reports/portfolio.csv"
            className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800/60"
          >
            Download CSV
          </a>
        }
      />

      {rows.length > 0 && (
        <div className="mt-6 grid grid-cols-3 gap-3">
          <Card className="p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">Revised contract value</p>
            <p className="mt-1 text-lg font-semibold text-slate-900 dark:text-slate-100">{formatCurrency(totals.revised)}</p>
          </Card>
          <Card className="p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">Claimed to date</p>
            <p className="mt-1 text-lg font-semibold text-slate-900 dark:text-slate-100">{formatCurrency(totals.claimed)}</p>
          </Card>
          <Card className="p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">Compliance alerts</p>
            <p className="mt-1 text-lg font-semibold text-slate-900 dark:text-slate-100">{totals.alerts}</p>
          </Card>
        </div>
      )}

      <Card className="mt-6 overflow-x-auto p-0">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-slate-100 text-xs uppercase tracking-wide text-slate-500 dark:border-slate-800/80 dark:text-slate-400">
              <th className="px-4 py-3 font-medium">Project</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Contract value</th>
              <th className="px-4 py-3 font-medium">Billed</th>
              <th className="px-4 py-3 font-medium">Schedule</th>
              <th className="px-4 py-3 font-medium">Alerts</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
            {rows.map((r) => (
              <tr key={r.id} className="transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/40">
                <td className="px-4 py-3">
                  <Link href={`/projects/${r.id}`} className="font-medium text-slate-900 hover:underline dark:text-slate-100">
                    {r.name}
                  </Link>
                </td>
                <td className="px-4 py-3">
                  <Badge tone={statusTone[r.status] ?? "neutral"}>{r.status.replace("_", " ")}</Badge>
                </td>
                <td className="px-4 py-3 text-slate-700 dark:text-slate-300">{formatCurrency(r.revisedContractValue)}</td>
                <td className="px-4 py-3 text-slate-700 dark:text-slate-300">
                  {r.percentBilled !== null ? `${r.percentBilled}%` : "—"}
                </td>
                <td className="px-4 py-3">
                  {r.scheduleVarianceDays === null ? (
                    <span className="text-slate-400 dark:text-slate-500">—</span>
                  ) : (
                    <Badge tone={r.scheduleVarianceDays <= 0 ? "emerald" : r.scheduleVarianceDays <= 14 ? "amber" : "red"}>
                      {r.scheduleVarianceDays <= 0 ? "on time" : `${r.scheduleVarianceDays}d behind`}
                    </Badge>
                  )}
                </td>
                <td className="px-4 py-3">
                  {r.complianceAlertCount > 0 ? (
                    <Link href="/compliance">
                      <Badge tone="red">{r.complianceAlertCount}</Badge>
                    </Link>
                  ) : (
                    <span className="text-slate-400 dark:text-slate-500">0</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!rows.length && <p className="p-5 text-sm text-slate-500 dark:text-slate-400">No projects yet.</p>}
      </Card>
    </div>
  );
}
