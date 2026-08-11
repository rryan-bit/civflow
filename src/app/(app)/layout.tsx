import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ThemeToggle from "@/components/theme-toggle";
import SearchBox from "./search-box";
import NotificationBell from "./notification-bell";
import { AppSidebar } from "./app-sidebar";

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
      <AppSidebar displayName={displayName} initial={initial} />
      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 flex items-center justify-end gap-2 border-b border-slate-100 bg-white/85 py-3 pl-16 pr-5 backdrop-blur-md dark:border-slate-800/60 dark:bg-slate-950/85 lg:pl-5 print:hidden">
          <SearchBox />
          <NotificationBell />
          <ThemeToggle />
        </header>
        <main className="app-bottom-safe-area mx-auto max-w-6xl px-5 pt-8">{children}</main>
      </div>
    </div>
  );
}
