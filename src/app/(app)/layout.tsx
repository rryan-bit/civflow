import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import SignOutButton from "./sign-out-button";

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

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <Link href="/dashboard" className="text-lg font-semibold text-slate-900">
            CivFlow
          </Link>
          <div className="flex items-center gap-3 text-sm text-slate-600">
            <span>{profile?.full_name ?? user.email}</span>
            <SignOutButton />
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-8">
        {!profile?.company_id ? (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
            Your account isn&apos;t linked to a company yet. Ask an admin to
            assign your profile to a company in Supabase, then refresh this
            page.
          </div>
        ) : (
          children
        )}
      </main>
    </div>
  );
}
