import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import SignOutButton from "./sign-out-button";
import ThemeToggle from "@/components/theme-toggle";
import SearchBox from "./search-box";
import NotificationBell from "./notification-bell";
import { Logo } from "@/components/logo";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, role, company_id")
    .eq("id", user.id)
    .single();

  if (!profile?.company_id) {
    redirect("/onboarding");
  }

  // Field workers get their own deliberately narrow area — the rest of the
  // app assumes broader read access that their RLS locks them out of.
  if (profile.role === "field_worker") {
    redirect("/site");
  }

  const displayName = profile?.full_name ?? user.email ?? "";
  const initial = displayName.trim().charAt(0).toUpperCase() || "?";

  return (
    <div className="min-h-screen bg-background">
      <header className="app-header-safe-area sticky top-0 z-30 border-b border-slate-100 bg-white/85 backdrop-blur-md dark:border-slate-800/60 dark:bg-slate-950/85 print:hidden">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 pb-3">
          <div className="flex items-center gap-7">
            <Link href="/dashboard" className="transition-opacity hover:opacity-80">
              <Logo />
            </Link>
            {profile?.company_id && (
              <nav className="hidden items-center gap-1 sm:flex">
                <Link
                  href="/dashboard"
                  className="rounded-lg px-3 py-1.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
                >
                  Dashboard
                </Link>
                <Link
                  href="/leads"
                  className="rounded-lg px-3 py-1.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
                >
                  Leads
                </Link>
                <Link
                  href="/team"
                  className="rounded-lg px-3 py-1.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
                >
                  Team
                </Link>
                <Link
                  href="/messages"
                  className="rounded-lg px-3 py-1.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
                >
                  Messages
                </Link>
                <Link
                  href="/calendar"
                  className="rounded-lg px-3 py-1.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
                >
                  Calendar
                </Link>
                <Link
                  href="/equipment"
                  className="rounded-lg px-3 py-1.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
                >
                  Equipment
                </Link>
                <Link
                  href="/compliance"
                  className="rounded-lg px-3 py-1.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
                >
                  Compliance
                </Link>
                <Link
                  href="/reports"
                  className="rounded-lg px-3 py-1.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
                >
                  Reports
                </Link>
              </nav>
            )}
          </div>
          <div className="flex items-center gap-3">
            {profile?.company_id && <SearchBox />}
            {profile?.company_id && <NotificationBell />}
            <ThemeToggle />
            <div className="mx-1 hidden h-6 w-px bg-slate-200 dark:bg-slate-800 sm:block" />
            <div className="hidden items-center gap-2 sm:flex">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-navy text-xs font-semibold text-white dark:bg-brand-orange">
                {initial}
              </span>
              <span className="max-w-[10rem] truncate text-sm font-medium text-slate-700 dark:text-slate-300">{displayName}</span>
            </div>
            <SignOutButton />
          </div>
        </div>
      </header>
      <main className="app-bottom-safe-area mx-auto max-w-6xl px-5 pt-8">{children}</main>
    </div>
  );
}
