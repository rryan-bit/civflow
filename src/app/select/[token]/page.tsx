import ChooseForm from "./choose-form";
import ThemeToggle from "@/components/theme-toggle";
import { LogoMark } from "@/components/logo";
import { createClient } from "@/lib/supabase/server";

function formatCurrency(n: number | null) {
  if (n === null) return null;
  return n.toLocaleString(undefined, { style: "currency", currency: "AUD", maximumFractionDigits: 0 });
}

export default async function SelectionChoicePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const supabase = await createClient();

  const { data: selection } = await supabase.rpc("get_selection_by_token", { selection_token: token });
  const options = selection?.options ?? [];
  const chosenOption = options.find((o) => o.id === selection?.chosen_option_id);

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
          <h1 className="mt-3 text-xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">CivFlow</h1>
        </div>

        <div className="surface-card p-8 text-center" style={{ boxShadow: "var(--shadow-elevated)" }}>
          {!selection || !selection.is_valid ? (
            <p className="text-sm text-slate-500 dark:text-slate-400">
              This link isn&apos;t valid. Ask your builder to check the link they sent you.
            </p>
          ) : (
            <>
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                Selection — {selection.project_name}
              </p>
              <h2 className="mt-1 text-lg font-semibold text-slate-900 dark:text-slate-100">{selection.category}</h2>

              {selection.description && (
                <p className="mt-3 whitespace-pre-wrap text-left text-sm text-slate-700 dark:text-slate-300">{selection.description}</p>
              )}

              {selection.allowance_amount !== null && selection.allowance_amount !== undefined && (
                <div className="mt-4 rounded-lg border border-slate-200 p-3 text-left dark:border-slate-800">
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">Allowance</p>
                  <p className="mt-1 text-lg font-semibold text-slate-900 dark:text-slate-100">{formatCurrency(selection.allowance_amount)}</p>
                </div>
              )}

              {selection.client_chosen_at ? (
                <div className="mt-6 rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-300">
                  Already chosen by {selection.client_chosen_name}
                  {chosenOption && `: ${chosenOption.name}`} on{" "}
                  {new Date(selection.client_chosen_at).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })}.
                </div>
              ) : (
                <ChooseForm token={token} options={options} />
              )}
            </>
          )}
        </div>
      </div>
    </main>
  );
}
