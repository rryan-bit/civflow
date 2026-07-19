"use client";

import { useMemo, useState } from "react";

export type AdminUserRow = {
  id: string;
  full_name: string | null;
  email: string | null;
  role: string;
  company_name: string | null;
  created_at: string;
};

const roleLabel: Record<string, string> = {
  admin: "Admin",
  supervisor: "Supervisor",
  project_manager: "Project manager",
  field_worker: "Field worker",
};

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("en-AU", { year: "numeric", month: "short", day: "numeric" });
}

export function UsersTable({ users }: { users: AdminUserRow[] }) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return users;
    return users.filter(
      (u) =>
        (u.full_name ?? "").toLowerCase().includes(q) ||
        (u.email ?? "").toLowerCase().includes(q) ||
        (u.company_name ?? "").toLowerCase().includes(q)
    );
  }, [users, query]);

  return (
    <div>
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search by name, email, or company…"
        className="w-full rounded-lg border-0 bg-slate-800 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-orange/40 sm:w-80"
      />

      <div className="mt-4 overflow-hidden rounded-xl border border-slate-800 bg-slate-900">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-800 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Company</th>
              <th className="px-4 py-3">Role</th>
              <th className="px-4 py-3">Joined</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {filtered.map((u) => (
              <tr key={u.id} className="transition-colors hover:bg-slate-800/60">
                <td className="px-4 py-3 text-slate-100">{u.full_name ?? "Unnamed"}</td>
                <td className="px-4 py-3 text-slate-400">{u.email ?? "—"}</td>
                <td className="px-4 py-3 text-slate-400">{u.company_name ?? "No company"}</td>
                <td className="px-4 py-3 text-slate-400">{roleLabel[u.role] ?? u.role}</td>
                <td className="px-4 py-3 text-slate-400">{formatDate(u.created_at)}</td>
              </tr>
            ))}
            {!filtered.length && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-slate-500">No users match that search.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
