import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { UsersTable, type AdminUserRow } from "./users-table";

export default async function AdminUsersPage() {
  const admin = createAdminClient();

  const [{ data: profiles }, { data: companies }] = await Promise.all([
    admin.from("profiles").select("id, full_name, email, role, company_id, created_at").order("created_at", { ascending: false }),
    admin.from("companies").select("id, name"),
  ]);

  const companyNameById = new Map((companies ?? []).map((c) => [c.id, c.name]));
  const rows: AdminUserRow[] = (profiles ?? []).map((p) => ({
    id: p.id,
    full_name: p.full_name,
    email: p.email,
    role: p.role,
    company_name: p.company_id ? companyNameById.get(p.company_id) ?? null : null,
    created_at: p.created_at,
  }));

  return (
    <div className="animate-fade-in">
      <Link href="/admin" className="text-xs font-medium text-slate-400 hover:text-slate-100 hover:underline">← Overview</Link>
      <h1 className="mt-2 text-2xl font-semibold tracking-tight text-white">Users</h1>
      <p className="mt-1 text-sm text-slate-400">{rows.length} users across every company.</p>

      <div className="mt-6">
        <UsersTable users={rows} />
      </div>
    </div>
  );
}
