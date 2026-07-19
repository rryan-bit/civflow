import Link from "next/link";
import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";

const companyTypeLabel: Record<string, string> = {
  residential_builder: "Residential builder",
  commercial_contractor: "Commercial contractor",
};

const roleLabel: Record<string, string> = {
  admin: "Admin",
  supervisor: "Supervisor",
  project_manager: "Project manager",
  field_worker: "Field worker",
};

function formatDate(d: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-AU", { year: "numeric", month: "short", day: "numeric" });
}

function formatCurrency(n: number | null) {
  if (n === null) return "—";
  return n.toLocaleString(undefined, { style: "currency", currency: "AUD", maximumFractionDigits: 0 });
}

export default async function AdminCompanyDetailPage({ params }: { params: Promise<{ companyId: string }> }) {
  const { companyId } = await params;
  const admin = createAdminClient();

  const { data: company } = await admin.from("companies").select("*").eq("id", companyId).single();
  if (!company) notFound();

  const [{ data: users }, { data: projects }] = await Promise.all([
    admin
      .from("profiles")
      .select("id, full_name, email, role, created_at")
      .eq("company_id", companyId)
      .order("created_at", { ascending: true }),
    admin
      .from("projects")
      .select("id, name, status, contract_value, created_at")
      .eq("company_id", companyId)
      .order("created_at", { ascending: false }),
  ]);

  return (
    <div className="animate-fade-in">
      <Link href="/admin/companies" className="text-xs font-medium text-slate-400 hover:text-slate-100 hover:underline">← Companies</Link>
      <h1 className="mt-2 text-2xl font-semibold tracking-tight text-white">{company.name}</h1>
      <p className="mt-1 text-sm text-slate-400">
        {companyTypeLabel[company.company_type] ?? company.company_type} · created {formatDate(company.created_at)}
      </p>

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Users</p>
          <p className="mt-1.5 text-2xl font-semibold text-white">{users?.length ?? 0}</p>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Projects</p>
          <p className="mt-1.5 text-2xl font-semibold text-white">{projects?.length ?? 0}</p>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">QBCC licence</p>
          <p className="mt-1.5 text-sm text-white">
            {company.qbcc_licence_number ?? "Not set"}
            {company.qbcc_licence_expiry && <span className="block text-xs text-slate-500">expires {formatDate(company.qbcc_licence_expiry)}</span>}
          </p>
        </div>
      </div>

      <div className="mt-6 rounded-xl border border-slate-800 bg-slate-900 p-0">
        <div className="border-b border-slate-800 px-4 py-3">
          <h2 className="text-sm font-semibold text-slate-300">Users</h2>
        </div>
        <div className="divide-y divide-slate-800">
          {(users ?? []).map((u) => (
            <div key={u.id} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
              <div className="min-w-0">
                <p className="truncate text-slate-100">{u.full_name ?? "Unnamed"}</p>
                <p className="truncate text-xs text-slate-500">{u.email ?? "No email on file"}</p>
              </div>
              <div className="flex shrink-0 items-center gap-3">
                <span className="rounded-full bg-slate-800 px-2 py-0.5 text-xs text-slate-300">{roleLabel[u.role] ?? u.role}</span>
                <span className="text-xs text-slate-500">joined {formatDate(u.created_at)}</span>
              </div>
            </div>
          ))}
          {!users?.length && <p className="px-4 py-6 text-center text-sm text-slate-500">No users yet.</p>}
        </div>
      </div>

      <div className="mt-6 rounded-xl border border-slate-800 bg-slate-900 p-0">
        <div className="border-b border-slate-800 px-4 py-3">
          <h2 className="text-sm font-semibold text-slate-300">Projects</h2>
        </div>
        <div className="divide-y divide-slate-800">
          {(projects ?? []).map((p) => (
            <div key={p.id} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
              <div className="min-w-0">
                <p className="truncate text-slate-100">{p.name}</p>
                <p className="text-xs text-slate-500">created {formatDate(p.created_at)}</p>
              </div>
              <div className="flex shrink-0 items-center gap-3">
                <span className="text-xs text-slate-400">{formatCurrency(p.contract_value)}</span>
                <span className={`rounded-full px-2 py-0.5 text-xs ${p.status === "active" ? "bg-emerald-900/40 text-emerald-400" : "bg-slate-800 text-slate-400"}`}>
                  {p.status}
                </span>
              </div>
            </div>
          ))}
          {!projects?.length && <p className="px-4 py-6 text-center text-sm text-slate-500">No projects yet.</p>}
        </div>
      </div>
    </div>
  );
}
