import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import SignOutButton from "@/app/(app)/sign-out-button";
import ThemeToggle from "@/components/theme-toggle";
import { Logo } from "@/components/logo";

// A deliberately small shell for field_worker accounts — no main nav, no
// search, nothing that assumes company-wide visibility. Middleware already
// redirects signed-out visitors to /login for any non-public route, so this
// only needs to check the role.
export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase.from("profiles").select("role, company_id").eq("id", user.id).single();

  if (!profile?.company_id) redirect("/onboarding");
  if (profile.role !== "field_worker") redirect("/dashboard");

  return (
    <div className="min-h-screen bg-background">
      <header className="app-header-safe-area sticky top-0 z-30 border-b border-slate-200/70 bg-white/80 backdrop-blur-md dark:border-slate-800/70 dark:bg-slate-950/80">
        <div className="mx-auto flex max-w-2xl items-center justify-between gap-4 px-5 pb-3">
          <div className="flex items-center gap-6">
            <Link href="/site" className="transition-opacity hover:opacity-80">
              <Logo />
            </Link>
            <nav className="flex items-center gap-1">
              <Link
                href="/site"
                className="rounded-lg px-3 py-1.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
              >
                Home
              </Link>
              <Link
                href="/site/messages"
                className="rounded-lg px-3 py-1.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
              >
                Messages
              </Link>
            </nav>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <SignOutButton />
          </div>
        </div>
      </header>
      <main className="app-bottom-safe-area mx-auto max-w-2xl px-5 pt-8">{children}</main>
    </div>
  );
}
