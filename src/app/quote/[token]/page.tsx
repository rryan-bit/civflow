import AcceptForm from "./accept-form";
import ThemeToggle from "@/components/theme-toggle";
import { LogoMark } from "@/components/logo";
import { createClient } from "@/lib/supabase/server";

function formatCurrency(n: number | null) {
  if (n === null) return null;
  return n.toLocaleString(undefined, { style: "currency", currency: "AUD", maximumFractionDigits: 0 });
}

export default async function QuoteAcceptPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const supabase = await createClient();

  const { data: rows } = await supabase.rpc("get_quote_by_token", { quote_token: token });
  const quote = rows?.[0];

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
          {!quote || !quote.is_valid ? (
            <p className="text-sm text-slate-500 dark:text-slate-400">
              This link isn&apos;t valid. Ask your builder to check the link they sent you.
            </p>
          ) : (
            <>
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                Quote from {quote.company_name}
              </p>
              <h2 className="mt-1 text-lg font-semibold text-slate-900 dark:text-slate-100">{quote.client_name}</h2>
              {quote.site_address && <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">{quote.site_address}</p>}

              {quote.description && (
                <p className="mt-3 whitespace-pre-wrap text-left text-sm text-slate-700 dark:text-slate-300">{quote.description}</p>
              )}

              <div className="mt-4 rounded-lg border border-slate-200 p-3 dark:border-slate-800">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">Quoted price</p>
                <p className="mt-1 text-2xl font-semibold text-slate-900 dark:text-slate-100">{formatCurrency(quote.quote_amount)}</p>
                {quote.quote_sent_date && <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Sent {quote.quote_sent_date}</p>}
              </div>

              {quote.quote_accepted_at ? (
                <div className="mt-6 rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-300">
                  Already accepted by {quote.quote_accepted_name} on{" "}
                  {new Date(quote.quote_accepted_at).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })}.
                </div>
              ) : (
                <AcceptForm token={token} />
              )}
            </>
          )}
        </div>
      </div>
    </main>
  );
}
