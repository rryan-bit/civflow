import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { SignupsChart } from "./signups-chart";

const companyTypeLabel: Record<string, string> = {
  residential_builder: "Residential builder",
  commercial_contractor: "Commercial contractor",
};

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("en-AU", { year: "numeric", month: "short", day: "numeric" });
}

function startOfWeek(d: Date): Date {
  const date = new Date(d);
  const day = date.getDay();
  const diff = (day + 6) % 7; // Monday as week start
  date.setDate(date.getDate() - diff);
  date.setHours(0, 0, 0, 0);
  return date;
}

export default async function AdminOverviewPage() {
  const admin = createAdminClient();

  const [
    { count: companyCount },
    { count: userCount },
    { count: projectCount },
    { count: diaryEntryCount },
    { data: recentCompanies },
    { data: recentProfiles },
    { data: signupDates },
  ] = await Promise.all([
    admin.from("companies").select("id", { count: "exact", head: true }),
    admin.from("profiles").select("id", { count: "exact", head: true }),
    admin.from("projects").select("id", { count: "exact", head: true }),
    admin.from("diary_entries").select("id", { count: "exact", head: true }),
    admin.from("companies").select("id, name, company_type, created_at").order("created_at", { ascending: false }).limit(8),
    admin.from("profiles").select("id, full_name, email, role, company_id, created_at").order("created_at", { ascending: false }).limit(8),
    admin.from("profiles").select("created_at").order("created_at", { ascending: false }).limit(2000),
  ]);

  const profileCompanyIds = [...new Set((recentProfiles ?? []).map((p) => p.company_id).filter((id): id is string => id !== null))];
  const { data: profileCompanies } = profileCompanyIds.length
    ? await admin.from("companies").select("id, name").in("id", profileCompanyIds)
    : { data: [] as { id: string; name: string }[] };
  const companyNameById = new Map((profileCompanies ?? []).map((c) => [c.id, c.name]));

  // Bucket signups by week (Mon-start), last 12 weeks, for a lightweight
  // growth chart — computed here rather than in SQL since Supabase's
  // client library has no GROUP BY, and the user count is small enough
  // that this is cheap.
  const weeks: { label: string; count: number }[] = [];
  const now = new Date();
  for (let i = 11; i >= 0; i--) {
    const weekStart = startOfWeek(new Date(now.getTime() - i * 7 * 24 * 60 * 60 * 1000));
    const weekEnd = new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000);
    const count = (signupDates ?? []).filter((p) => {
      const t = new Date(p.created_at).getTime();
      return t >= weekStart.getTime() && t < weekEnd.getTime();
    }).length;
    weeks.push({ label: weekStart.toLocaleDateString("en-AU", { month: "short", day: "numeric" }), count });
  }

  const stats = [
    { label: "Companies", value: companyCount ?? 0, href: "/admin/companies" },
    { label: "Users", value: userCount ?? 0, href: "/admin/users" },
    { label: "Projects", value: projectCount ?? 0, href: null },
    { label: "Diary entries logged", value: diaryEntryCount ?? 0, href: null },
  ];

  return (
    <div className="animate-fade-in">
      <h1 className="text-2xl font-semibold tracking-tight text-white">Platform overview</h1>
      <p className="mt-1 text-sm text-slate-400">Read-only — every company and user on CivFlow, in one place.</p>

      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        {stats.map((s) => {
          const Wrapper = s.href ? Link : "div";
          return (
            <Wrapper key={s.label} href={s.href ?? "#"} className="block rounded-xl border border-slate-800 bg-slate-900 p-4 transition-colors hover:border-slate-700">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{s.label}</p>
              <p className="mt-1.5 text-2xl font-semibold text-white">{s.value.toLocaleString()}</p>
            </Wrapper>
          );
        })}
      </div>

      <div className="mt-6 rounded-xl border border-slate-800 bg-slate-900 p-5">
        <h2 className="text-sm font-semibold text-slate-300">Signups per week</h2>
        <div className="mt-3">
          <SignupsChart data={weeks} />
        </div>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-0">
          <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
            <h2 className="text-sm font-semibold text-slate-300">Recent companies</h2>
            <Link href="/admin/companies" className="text-xs font-medium text-brand-orange hover:underline">View all</Link>
          </div>
          <div className="divide-y divide-slate-800">
            {(recentCompanies ?? []).map((c) => (
              <Link key={c.id} href={`/admin/companies/${c.id}`} className="flex items-center justify-between gap-3 px-4 py-3 text-sm transition-colors hover:bg-slate-800/60">
                <div className="min-w-0">
                  <p className="truncate text-slate-100">{c.name}</p>
                  <p className="text-xs text-slate-500">{companyTypeLabel[c.company_type] ?? c.company_type}</p>
                </div>
                <span className="shrink-0 text-xs text-slate-500">{formatDate(c.created_at)}</span>
              </Link>
            ))}
            {!recentCompanies?.length && <p className="px-4 py-6 text-center text-sm text-slate-500">No companies yet.</p>}
          </div>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900 p-0">
          <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
            <h2 className="text-sm font-semibold text-slate-300">Recent signups</h2>
            <Link href="/admin/users" className="text-xs font-medium text-brand-orange hover:underline">View all</Link>
          </div>
          <div className="divide-y divide-slate-800">
            {(recentProfiles ?? []).map((p) => (
              <div key={p.id} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
                <div className="min-w-0">
                  <p className="truncate text-slate-100">{p.full_name ?? p.email ?? "Unnamed"}</p>
                  <p className="truncate text-xs text-slate-500">
                    {p.company_id ? companyNameById.get(p.company_id) ?? "Unknown company" : "No company"} · {p.role}
                  </p>
                </div>
                <span className="shrink-0 text-xs text-slate-500">{formatDate(p.created_at)}</span>
              </div>
            ))}
            {!recentProfiles?.length && <p className="px-4 py-6 text-center text-sm text-slate-500">No users yet.</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
