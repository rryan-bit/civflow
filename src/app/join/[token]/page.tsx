import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import JoinButton from "./join-button";
import ThemeToggle from "@/components/theme-toggle";
import { LogoMark } from "@/components/logo";
import { buttonStyles } from "@/components/ui/button-styles";

export default async function JoinPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const supabase = await createClient();

  const { data: previewRows } = await supabase.rpc("get_invite_preview", { invite_token: token });
  const preview = previewRows?.[0];

  const {
    data: { user },
  } = await supabase.auth.getUser();

  let alreadyInCompany = false;
  if (user) {
    const { data: profile } = await supabase.from("profiles").select("company_id").eq("id", user.id).single();
    alreadyInCompany = Boolean(profile?.company_id);
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
          <LogoMark className="h-12 w-12 rounded-[12px] shadow-lg shadow-slate-900/10" />
          <h1 className="mt-3 text-xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">CivFlow</h1>
        </div>

        <div className="surface-card p-8 text-center" style={{ boxShadow: "var(--shadow-elevated)" }}>
          {!preview || !preview.is_valid ? (
            <p className="text-sm text-slate-500 dark:text-slate-400">
              This invite link is invalid or has expired. Ask whoever sent it to generate a new one.
            </p>
          ) : (
            <>
              <p className="text-sm text-slate-900 dark:text-slate-100">
                You&apos;ve been invited to join <span className="font-medium">{preview.company_name}</span> as a{" "}
                <span className="capitalize">{preview.role.replace("_", " ")}</span>.
              </p>

              {!user && (
                <div className="mt-6 space-y-2">
                  <Link href={`/login?next=/join/${token}`} className={`${buttonStyles("primary", "md")} w-full`}>
                    Sign in or create an account
                  </Link>
                  <p className="text-xs text-slate-500 dark:text-slate-400">You&apos;ll be brought back here afterward to join.</p>
                </div>
              )}

              {user && alreadyInCompany && (
                <p className="mt-6 text-sm text-slate-500 dark:text-slate-400">
                  Your account is already part of a company. Contact support if you need to switch.
                </p>
              )}

              {user && !alreadyInCompany && (
                <div className="mt-6">
                  <JoinButton token={token} />
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </main>
  );
}
