import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CompanyLicenceForm } from "./company-licence-form";
import { ProfileLicenceForm } from "./profile-licence-form";
import { CompanyTypeForm } from "./company-type-form";
import { CompanyBrandingForm } from "./company-branding-form";
import { XeroIntegrationCard } from "./xero-integration-card";
import { getProjectHealthAlerts, type ComplianceAlert } from "@/lib/compliance";
import { ExpandableGrid } from "@/components/ui/expandable-grid";
import { isXeroConfigured } from "@/lib/xero";

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

export default async function CompliancePage({
  searchParams,
}: {
  searchParams: Promise<{ xero_connected?: string; xero_error?: string }>;
}) {
  const { xero_connected, xero_error } = await searchParams;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, role, company_id, full_name, qbcc_licence_number, qbcc_licence_class, qbcc_licence_expiry")
    .eq("id", user!.id)
    .single();

  const { data: company } = profile?.company_id
    ? await supabase
        .from("companies")
        .select(
          "id, name, qbcc_licence_number, qbcc_licence_class, qbcc_licence_expiry, mfr_category, mfr_report_due_date, company_type, logo_storage_path"
        )
        .eq("id", profile.company_id)
        .single()
    : { data: null };

  const logoUrl = company?.logo_storage_path
    ? supabase.storage.from("company-logos").getPublicUrl(company.logo_storage_path).data.publicUrl
    : null;

  const isAdmin = profile?.role === "admin";
  const { data: xeroStatus } = isAdmin ? await supabase.rpc("get_xero_connection_status") : { data: null };
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
      <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">QBCC Compliance</h1>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
        Track your company&apos;s QBCC licence and financial reporting details in one place. This is a tracking tool,
        not a substitute for checking your obligations directly with the QBCC.
      </p>

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

      {company && (
        <Card className="mt-6 p-5">
          <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Company profile — {company.name}</h2>
          {isAdmin ? (
            <CompanyBrandingForm companyId={company.id} companyName={company.name} logoUrl={logoUrl} />
          ) : (
            <div className="mt-3 flex items-center gap-3">
              {logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={logoUrl} alt={`${company.name} logo`} className="h-12 w-12 rounded-lg border border-slate-200 object-contain dark:border-slate-800" />
              ) : null}
              <p className="text-sm text-slate-700 dark:text-slate-300">{company.name}</p>
            </div>
          )}

          <div className="mt-6 border-t border-slate-100 pt-4 dark:border-slate-800">
            <h3 className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">Company type</h3>
            {isAdmin ? (
              <>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  Controls how much shows up by default on every project. Only admins can change this.
                </p>
                <CompanyTypeForm companyId={company.id} companyType={company.company_type} />
              </>
            ) : (
              <p className="mt-2 text-sm text-slate-700 dark:text-slate-300">
                {company.company_type === "residential_builder" ? "Small residential builder" : "Civil / commercial contractor"}
              </p>
            )}
          </div>
        </Card>
      )}

      {isAdmin && (
        <XeroIntegrationCard
          connected={xeroStatus?.connected ?? false}
          tenantName={xeroStatus?.tenant_name ?? null}
          connectedAt={xeroStatus?.connected_at ?? null}
          configured={isXeroConfigured()}
          flash={{ connected: xero_connected === "1", error: xero_error }}
        />
      )}

      <Card className="mt-4 p-5">
        <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Company licence &amp; MFR details</h2>
        {isAdmin ? (
          <>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Only admins can edit these — visible to everyone on your team. Lodgement windows: SC1/SC2 opens 1 Nov,
              due 31 Mar; categories 1–7 open 1 Aug, due 31 Dec. Note the SC1/SC2 no-reporting exemption only applies
              to individual sole traders — a company holding an SC1/SC2 licence still has to report.
            </p>
            <CompanyLicenceForm company={company} />
          </>
        ) : (
          <div className="mt-3 space-y-2 text-sm text-slate-700 dark:text-slate-300">
            <p>Licence number: {company?.qbcc_licence_number ?? "Not set"}</p>
            <p>Licence class: {company?.qbcc_licence_class ?? "Not set"}</p>
            <p>Licence expiry: {company?.qbcc_licence_expiry ?? "Not set"}</p>
            <p>MFR category: {company?.mfr_category ?? "Not set"}</p>
            <p>MFR report due: {company?.mfr_report_due_date ?? "Not set"}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">Ask a company admin to update these.</p>
          </div>
        )}
      </Card>

      <Card className="mt-4 p-5">
        <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Your individual licence</h2>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          If you personally hold a QBCC licence (e.g. as a nominee or site supervisor), record it here.
        </p>
        <ProfileLicenceForm profile={profile} />
      </Card>
    </div>
  );
}
