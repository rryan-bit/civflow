import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";

const companyTypeLabel: Record<string, string> = {
  residential_builder: "Residential builder",
  commercial_contractor: "Commercial contractor",
};

function formatDate(d: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-AU", { year: "numeric", month: "short", day: "numeric" });
}

export default async function AdminCompaniesPage() {
  const admin = createAdminClient();

  const [{ data: companies }, { data: profiles }, { data: projects }, { data: recentEntries }] = await Promise.all([
    admin.from("companies").select("id, name, company_type, created_at").order("created_at", { ascending: false }),
    admin.from("profiles").select("company_id"),
    admin.from("projects").select("id, company_id"),
    admin.from("diary_entries").select("project_id, entry_date").order("entry_date", { ascending: false }).limit(3000),
  ]);

  const userCountByCompany = new Map<string, number>();
  for (const p of profiles ?? []) {
    if (!p.company_id) continue;
    userCountByCompany.set(p.company_id, (userCountByCompany.get(p.company_id) ?? 0) + 1);
  }

  const projectCountByCompany = new Map<string, number>();
  const companyIdByProjectId = new Map<string, string>();
  for (const p of projects ?? []) {
    projectCountByCompany.set(p.company_id, (projectCountByCompany.get(p.company_id) ?? 0) + 1);
    companyIdByProjectId.set(p.id, p.company_id);
  }

  const lastActiveByCompany = new Map<string, string>();
  for (const e of recentEntries ?? []) {
    const companyId = companyIdByProjectId.get(e.project_id);
    if (!companyId) continue;
    if (!lastActiveByCompany.has(companyId)) lastActiveByCompany.set(companyId, e.entry_date);
  }

  return (
    <div className="animate-fade-in">
      <Link href="/admin" className="text-xs font-medium text-slate-400 hover:text-slate-100 hover:underline">← Overview</Link>
      <h1 className="mt-2 text-2xl font-semibold tracking-tight text-white">Companies</h1>
      <p className="mt-1 text-sm text-slate-400">{companies?.length ?? 0} companies on CivFlow.</p>

      <div className="mt-6 overflow-hidden rounded-xl border border-slate-800 bg-slate-900">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-800 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
              <th className="px-4 py-3">Company</th>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">Users</th>
              <th className="px-4 py-3">Projects</th>
              <th className="px-4 py-3">Last diary entry</th>
              <th className="px-4 py-3">Created</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {(companies ?? []).map((c) => (
              <tr key={c.id} className="transition-colors hover:bg-slate-800/60">
                <td className="px-4 py-3">
                  <Link href={`/admin/companies/${c.id}`} className="font-medium text-slate-100 hover:underline">{c.name}</Link>
                </td>
                <td className="px-4 py-3 text-slate-400">{companyTypeLabel[c.company_type] ?? c.company_type}</td>
                <td className="px-4 py-3 text-slate-400">{userCountByCompany.get(c.id) ?? 0}</td>
                <td className="px-4 py-3 text-slate-400">{projectCountByCompany.get(c.id) ?? 0}</td>
                <td className="px-4 py-3 text-slate-400">{formatDate(lastActiveByCompany.get(c.id) ?? null)}</td>
                <td className="px-4 py-3 text-slate-400">{formatDate(c.created_at)}</td>
              </tr>
            ))}
            {!companies?.length && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-slate-500">No companies yet.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
