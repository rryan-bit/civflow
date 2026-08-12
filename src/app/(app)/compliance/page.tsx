import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getProjectHealthAlerts, type ComplianceAlert } from "@/lib/compliance";
import { ExpandableGrid } from "@/components/ui/expandable-grid";

function daysUntil(dateStr: string | null): number | null {
  if (!dateStr) return null;
  const diff = new Date(dateStr).getTime() - new Date().setHours(0, 0, 0, 0);
  return Math.round(diff / (1000 * 60 * 60 * 24));
}

function ExpiryBadge({ label, dateStr }: { label: string; dateStr: string | null }) {
  const days = daysUntil(dateStr);
  if (days === null) return <Badge>{label}: not set</Badge>;
  if (days < 0) return <Badge tone="red">{label}: overdue by {Math.abs(days)}d</Badge>;
  if (days <= 60) return <Badge tone="amber">{label}: due in {days}d</Badge>;
  return <Badge tone="emerald">{label}: {days}d away</Badge>;
}

export default async function CompliancePage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, company_id")
    .eq("id", user!.id)
    .single();

  const { data: company } = profile?.company_id
    ? await supabase
        .from("companies")
        .select("id, name, qbcc_licence_expiry, mfr_report_due_date")
        .eq("id", profile.company_id)
        .single()
    : { data: null };

  const alerts = await getProjectHealthAlerts(supabase, profile?.company_id ?? null);

  // Split into company-wide items (licence/MFR — not tied to a project) and
  // everything else, grouped by the project it's actually about. This is
  // the "see it broken down by project" detail view the dashboard's simple
  // notification list links out to.
  const companyAlerts = alerts.filter((a) => !a.projectId);
  const projectGroups = new Map<string, { name: string; alerts: ComplianceAlert[] }>();
  for (const a of alerts) {
    if (!a.projectId) continue;
    const group = projectGroups.get(a.projectId) ?? { name: a.projectName ?? "Project", alerts: [] };
    group.alerts.push(a);
    projectGroups.set(a.projectId, group);
  }
  const sortedProjectGroups = [...projectGroups.entries()].sort(([, a], [, b]) => {
    const aRed = a.alerts.filter((x) => x.severity === "red").length;
    const bRed = b.alerts.filter((x) => x.severity === "red").length;
    if (aRed !== bRed) return bRed - aRed;
    return b.alerts.length - a.alerts.length;
  });

  return (
    <div className="mx-auto max-w-2xl animate-fade-in">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">QBCC Compliance</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Track your company&apos;s QBCC licence and financial reporting details in one place. This is a tracking
            tool, not a substitute for checking your obligations directly with the QBCC.
          </p>
        </div>
        <Link href="/settings" className="shrink-0 text-sm font-medium text-brand-orange hover:underline">
          Manage settings
        </Link>
      </div>

      <Card className="mt-4 p-5">
        <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Project health — everything flagged</h2>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          Computed from what&apos;s actually recorded in CivFlow: overdue Directions to Rectify, payment claims
          missing a BIF Act supporting statement or past their due date, deposits over the statutory cap (10% under
          $20,000, 5% at or above), unpaid Home Warranty Insurance premiums, unreleased retention, expiring
          licences/MFR reporting, plus operational risks like schedule slippage, defects liability windows closing,
          and projects missing today&apos;s diary entry. A tracking aid, not a compliance guarantee.
        </p>

        {companyAlerts.length > 0 && (
          <div className="mt-4">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Company-wide</h3>
            <ul className="mt-2 space-y-2">
              {companyAlerts.map((alert, i) => (
                <li key={i} className="flex items-start gap-2 text-sm">
                  <Badge tone={alert.severity === "red" ? "red" : "amber"} className="mt-0.5 shrink-0">
                    {alert.severity === "red" ? "action needed" : "watch"}
                  </Badge>
                  <Link href={alert.href} className="text-slate-700 hover:underline dark:text-slate-300">
                    {alert.message}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}

        {sortedProjectGroups.length > 0 ? (
          <div className="mt-4 space-y-4">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">By project</h3>
            <div className="space-y-2">
              {sortedProjectGroups.map(([projectId, group]) => (
                <ExpandableGrid
                  key={projectId}
                  visibleCount={0}
                  collapsedLabel={group.name}
                  indicatorColor={group.alerts.some((a) => a.severity === "red") ? "bg-red-500" : "bg-amber-500"}
                  gridClassName="mt-2 space-y-2 rounded-2xl bg-surface p-4"
                >
                  {group.alerts.map((alert, i) => (
                    <div key={i} className="flex items-start gap-2 text-sm">
                      <Badge tone={alert.severity === "red" ? "red" : "amber"} className="mt-0.5 shrink-0">
                        {alert.severity === "red" ? "action needed" : "watch"}
                      </Badge>
                      <Link href={alert.href} className="text-slate-700 hover:underline dark:text-slate-300">
                        {alert.message}
                      </Link>
                    </div>
                  ))}
                </ExpandableGrid>
              ))}
            </div>
          </div>
        ) : (
          companyAlerts.length === 0 && (
            <p className="mt-3 text-sm text-emerald-700 dark:text-emerald-400">Nothing flagged right now.</p>
          )
        )}
      </Card>

      {company && (
        <div className="mt-4 flex flex-wrap gap-2">
          <ExpiryBadge label="Licence expiry" dateStr={company.qbcc_licence_expiry} />
          <ExpiryBadge label="MFR report due" dateStr={company.mfr_report_due_date} />
        </div>
      )}
    </div>
  );
}
