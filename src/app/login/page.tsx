"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import ThemeToggle from "@/components/theme-toggle";
import { LogoMark } from "@/components/logo";
import { Button } from "@/components/ui/button";

function getNextPath(): string {
  if (typeof window === "undefined") return "/dashboard";
  const next = new URLSearchParams(window.location.search).get("next");
  return next && next.startsWith("/") ? next : "/dashboard";
}

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();

  const [mode, setMode] = useState<"sign-in" | "sign-up">("sign-in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [nextPath] = useState(getNextPath);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const { error } =
      mode === "sign-in"
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({
            email,
            password,
            options: { data: { full_name: fullName } },
          });

    setLoading(false);

    if (error) {
      setError(error.message);
      return;
    }

    router.push(nextPath);
    router.refresh();
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-4">
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

      <div className="relative z-10 w-full max-w-sm animate-scale-in">
        <div className="mb-6 flex flex-col items-center">
          <LogoMark className="h-12 w-12 shadow-lg shadow-slate-900/10 rounded-[12px]" />
          <h1 className="mt-3 text-xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">CivFlow</h1>
        </div>

        <div className="surface-card p-8" style={{ boxShadow: "var(--shadow-elevated)" }}>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {mode === "sign-in" ? "Sign in to your account" : "Create an account"}
          </p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            {mode === "sign-up" && (
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Full name</label>
                <input type="text" required value={fullName} onChange={(e) => setFullName(e.target.value)} className="field mt-1" />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Email</label>
              <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="field mt-1" />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Password</label>
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="field mt-1"
              />
            </div>

            {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

            <Button type="submit" loading={loading} className="w-full">
              {loading ? "Please wait…" : mode === "sign-in" ? "Sign in" : "Sign up"}
            </Button>
          </form>

          <button
            type="button"
            onClick={() => setMode(mode === "sign-in" ? "sign-up" : "sign-in")}
            className="mt-4 text-sm text-slate-500 underline underline-offset-2 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
          >
            {mode === "sign-in" ? "Need an account? Sign up" : "Already have an account? Sign in"}
          </button>

          {mode === "sign-up" && (
            <p className="mt-4 text-xs text-slate-500 dark:text-slate-400">
              {nextPath.startsWith("/join/")
                ? "After you sign up, you'll be brought back to your invite to join the team."
                : "New accounts aren't linked to a company yet — an admin needs to assign your profile to a company before you can see any projects."}
            </p>
          )}
        </div>
      </div>
    </main>
  );
}
