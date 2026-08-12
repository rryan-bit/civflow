import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/card";
import { CompanyLicenceForm } from "./company-licence-form";
import { ProfileLicenceForm } from "./profile-licence-form";
import { CompanyTypeForm } from "./company-type-form";
import { CompanyBrandingForm } from "./company-branding-form";
import { XeroIntegrationCard } from "./xero-integration-card";
import { isXeroConfigured } from "@/lib/xero";

export default async function SettingsPage({
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

  return (
    <div className="mx-auto max-w-2xl animate-fade-in">
      <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">Settings</h1>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
        Company profile, licence details, and integrations. For a live view of what needs attention, see{" "}
        <Link href="/compliance" className="text-brand-orange hover:underline">
          Compliance
        </Link>
        .
      </p>

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
