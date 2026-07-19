import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { OnboardingForm } from "./onboarding-form";
import ThemeToggle from "@/components/theme-toggle";
import { LogoMark } from "@/components/logo";

export default async function OnboardingPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/onboarding");
  }

  const { data: profile } = await supabase.from("profiles").select("company_id").eq("id", user.id).single();
  if (profile?.company_id) {
    redirect("/dashboard");
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-4 py-10">
      <div
        className="pointer-events-none absolute inset-0 opacity-60 dark:opacity-40"
        style={{
          background:
            "radial-gradient(600px circle at 20% 15%, rgb(249 115 22 / 0.10), transparent 60%), radial-gradient(700px circle at 85% 85%, rgb(30 58 95 / 0.12), transparent 60%)",
        }}
      />
      <div className="absolute right-4 top-4 z-10">
        <ThemeToggle />
      </div>

      <div className="relative z-10 w-full max-w-md animate-scale-in">
        <div className="mb-6 flex flex-col items-center">
          <LogoMark className="h-12 w-12 rounded-[12px] shadow-lg shadow-slate-900/10" />
          <h1 className="mt-3 text-xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">Set up your company</h1>
          <p className="mt-1 text-center text-sm text-slate-500 dark:text-slate-400">
            One quick step before your dashboard — this decides how much shows up by default.
          </p>
        </div>

        <div className="surface-card p-8" style={{ boxShadow: "var(--shadow-elevated)" }}>
          <OnboardingForm />
        </div>
      </div>
    </main>
  );
}
