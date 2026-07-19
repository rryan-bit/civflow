import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isPlatformAdmin } from "@/lib/admin-access";
import { Logo } from "@/components/logo";
import AdminSignOutButton from "./admin-sign-out-button";

// Platform-wide oversight — deliberately a separate top-level route from
// the (app) group rather than nested inside it: everything in (app) is
// scoped to the signed-in user's own company via RLS on the normal
// session-scoped client, and assumes profile.company_id is set. This is
// the opposite: cross-company, read-only, powered by the service-role
// admin client, and doesn't require the viewer to belong to a company at
// all. Keeping it structurally separate makes it much harder to
// accidentally leak a cross-company query into a normal company-scoped
// page (or vice versa).

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login?next=/admin");
  if (!isPlatformAdmin(user.email)) redirect("/dashboard");

  // Every /admin page reads across companies via the service-role client,
  // which throws immediately if this key isn't set — surface that as a
  // clear, expected message here instead of letting each page crash into
  // the generic error boundary.
  const serviceRoleConfigured = Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);

  return (
    <div className="min-h-screen bg-slate-950">
      <header className="sticky top-0 z-30 border-b border-slate-800 bg-slate-950/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-3">
          <div className="flex items-center gap-6">
            <Link href="/admin" className="flex items-center gap-2 transition-opacity hover:opacity-80">
              <Logo />
              <span className="rounded-md bg-red-500/15 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-red-400">
                Admin
              </span>
            </Link>
            <nav className="hidden items-center gap-1 sm:flex">
              <Link href="/admin" className="rounded-lg px-3 py-1.5 text-sm font-medium text-slate-400 transition-colors hover:bg-slate-800 hover:text-slate-100">
                Overview
              </Link>
              <Link href="/admin/companies" className="rounded-lg px-3 py-1.5 text-sm font-medium text-slate-400 transition-colors hover:bg-slate-800 hover:text-slate-100">
                Companies
              </Link>
              <Link href="/admin/users" className="rounded-lg px-3 py-1.5 text-sm font-medium text-slate-400 transition-colors hover:bg-slate-800 hover:text-slate-100">
                Users
              </Link>
            </nav>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/dashboard" className="text-xs font-medium text-slate-400 hover:text-slate-100 hover:underline">
              ← Back to CivFlow
            </Link>
            <AdminSignOutButton />
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-5 py-8 text-slate-100">
        {serviceRoleConfigured ? (
          children
        ) : (
          <div className="rounded-xl border border-amber-800/60 bg-amber-950/30 p-5">
            <h1 className="text-lg font-semibold text-amber-200">Admin panel isn&apos;t configured yet</h1>
            <p className="mt-2 text-sm text-amber-100/90">
              This needs <code className="rounded bg-amber-900/50 px-1.5 py-0.5">SUPABASE_SERVICE_ROLE_KEY</code> set
              in your environment — it&apos;s how the panel reads across every company, bypassing the normal
              per-company restriction every other page in CivFlow has.
            </p>
            <ol className="mt-3 list-decimal space-y-1 pl-5 text-sm text-amber-100/90">
              <li>In Supabase: Project Settings → API → copy the <strong>service_role</strong> key (keep it secret).</li>
              <li>
                Add it to <code className="rounded bg-amber-900/50 px-1.5 py-0.5">.env.local</code> as{" "}
                <code className="rounded bg-amber-900/50 px-1.5 py-0.5">SUPABASE_SERVICE_ROLE_KEY=...</code> (see{" "}
                <code className="rounded bg-amber-900/50 px-1.5 py-0.5">.env.local.example</code>).
              </li>
              <li>Restart the dev server (or redeploy, if this is running on Vercel).</li>
            </ol>
          </div>
        )}
      </main>
    </div>
  );
}
