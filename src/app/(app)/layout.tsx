import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AppShell } from "./app-sidebar";

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
    <AppShell displayName={displayName} initial={initial}>
      {children}
    </AppShell>
  );
}
