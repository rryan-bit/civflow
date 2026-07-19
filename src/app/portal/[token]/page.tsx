import Link from "next/link";
import ThemeToggle from "@/components/theme-toggle";
import { LogoMark } from "@/components/logo";
import { Card } from "@/components/ui/card";
import { Badge, BadgeTone } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const claimStatusTone: Record<string, BadgeTone> = {
  submitted: "amber",
  schedule_received: "blue",
  paid: "emerald",
  disputed: "red",
};

const milestoneStatusTone: Record<string, BadgeTone> = {
  pending: "neutral",
  on_track: "emerald",
  at_risk: "amber",
  delayed: "red",
  complete: "blue",
};

const documentCategoryLabel: Record<string, string> = {
  contract: "Contract",
  insurance: "Insurance",
  plans: "Plans",
  permit: "Permit",
  other: "Other",
};

function formatCurrency(n: number | null) {
  if (n === null) return "—";
  return n.toLocaleString(undefined, { style: "currency", currency: "AUD", maximumFractionDigits: 0 });
}

function formatDate(d: string | null | undefined) {
  if (!d) return null;
  return new Date(d).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

export default async function ProjectPortalPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const supabase = await createClient();

  const { data: portal } = await supabase.rpc("get_project_portal_data", { portal_token: token });

  if (!portal?.is_valid) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="surface-card max-w-sm p-8 text-center" style={{ boxShadow: "var(--shadow-elevated)" }}>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            This link isn&apos;t valid. Ask your builder to check the link they sent you.
          </p>
        </div>
      </main>
    );
  }

  const milestones = portal.milestones ?? [];
  const pendingVariations = portal.variations_awaiting_approval ?? [];
  const approvedVariations = portal.variations_approved ?? [];
  const pendingSelections = portal.selections_awaiting_choice ?? [];
  const chosenSelections = portal.selections_chosen ?? [];
  const claims = portal.payment_claims ?? [];
  const recentEntries = portal.recent_entries ?? [];
  const photos = portal.photos ?? [];
  const clientDocuments = portal.documents ?? [];

  // Photos and documents live in the `diary-media` bucket, which requires an
  // authenticated role to read — an anonymous portal visitor can't fetch
  // them directly. Mint short-lived signed URLs server-side with the
  // service-role admin client instead. If SUPABASE_SERVICE_ROLE_KEY isn't
  // configured, skip these sections rather than erroring the whole page.
  const photoUrls: (string | null)[] = photos.map(() => null);
  const documentUrls: (string | null)[] = clientDocuments.map(() => null);
  const allPaths = [...photos.map((p) => p.storage_path), ...clientDocuments.map((d) => d.storage_path)];
  if (allPaths.length) {
    try {
      const admin = createAdminClient();
      const { data: signed } = await admin.storage.from("diary-media").createSignedUrls(allPaths, 3600);
      (signed ?? []).forEach((s, i) => {
        if (!s.signedUrl) return;
        if (i < photos.length) photoUrls[i] = s.signedUrl;
        else documentUrls[i - photos.length] = s.signedUrl;
      });
    } catch {
      // Admin client not configured — photos/documents just won't render below.
    }
  }

  return (
    <main className="min-h-screen bg-background px-4 py-8">
      <div className="mx-auto max-w-2xl animate-fade-in">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <LogoMark className="h-9 w-9 rounded-[10px]" />
            <span className="text-base font-semibold tracking-tight text-slate-900 dark:text-slate-100">CivFlow</span>
          </div>
          <ThemeToggle />
        </div>

        <div className="mt-6">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
            {portal.company_name}
            {portal.licence_number && ` · QBCC Licence No. ${portal.licence_number}`}
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">{portal.project_name}</h1>
          <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">{portal.site_address}</p>
        </div>

        {portal.latest_progress && (
          <Card className="mt-6 p-5">
            <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Latest update — {formatDate(portal.latest_progress.entry_date)}</h2>
            <p className="mt-2 text-sm text-slate-900 dark:text-slate-100">{portal.latest_progress.summary}</p>
            {portal.latest_progress.percent_complete !== null && (
              <div className="mt-3">
                <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                  <div
                    className="h-full rounded-full bg-brand-orange"
                    style={{ width: `${Math.min(100, Math.max(0, portal.latest_progress.percent_complete))}%` }}
                  />
                </div>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{portal.latest_progress.percent_complete}% complete (estimated)</p>
              </div>
            )}
          </Card>
        )}

        {(portal.contract_value !== null && portal.contract_value !== undefined) && (
          <Card className="mt-4 p-5">
            <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Payment summary</h2>
            <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
              <div>
                <dt className="text-xs text-slate-500 dark:text-slate-400">Contract value</dt>
                <dd className="mt-0.5 font-medium text-slate-900 dark:text-slate-100">
                  {formatCurrency(portal.revised_contract_value ?? portal.contract_value ?? null)}
                </dd>
                {portal.revised_contract_value !== null &&
                  portal.revised_contract_value !== undefined &&
                  portal.contract_value !== null &&
                  portal.revised_contract_value !== portal.contract_value && (
                    <p className="text-xs text-slate-400 dark:text-slate-500">
                      Original {formatCurrency(portal.contract_value)}, includes approved variations
                    </p>
                  )}
              </div>
              <div>
                <dt className="text-xs text-slate-500 dark:text-slate-400">Total claimed</dt>
                <dd className="mt-0.5 font-medium text-slate-900 dark:text-slate-100">{formatCurrency(portal.total_claimed ?? 0)}</dd>
              </div>
              <div>
                <dt className="text-xs text-slate-500 dark:text-slate-400">Total paid</dt>
                <dd className="mt-0.5 font-medium text-slate-900 dark:text-slate-100">{formatCurrency(portal.total_paid ?? 0)}</dd>
              </div>
            </dl>
            {!!portal.revised_contract_value && (
              <div className="mt-4">
                <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                  <div
                    className="h-full rounded-full bg-emerald-500"
                    style={{
                      width: `${Math.min(100, Math.max(0, ((portal.total_paid ?? 0) / portal.revised_contract_value) * 100))}%`,
                    }}
                  />
                </div>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  {Math.round(((portal.total_paid ?? 0) / portal.revised_contract_value) * 100)}% of contract value paid to date
                </p>
              </div>
            )}
          </Card>
        )}

        {pendingVariations.length > 0 && (
          <Card className="mt-4 border-amber-200/80 bg-amber-50 p-5 dark:border-amber-800/60 dark:bg-amber-950/30">
            <h2 className="text-sm font-semibold text-amber-900 dark:text-amber-200">Awaiting your approval</h2>
            <ul className="mt-2 space-y-2">
              {pendingVariations.map((v, i) => (
                <li key={i} className="flex items-center justify-between gap-3 text-sm">
                  <span className="text-amber-900 dark:text-amber-200">
                    {v.title}
                    {v.cost_impact !== null && ` — ${formatCurrency(v.cost_impact)}`}
                  </span>
                  <Link
                    href={`/vary/${v.token}`}
                    className="shrink-0 font-medium text-amber-900 underline underline-offset-2 hover:text-amber-950 dark:text-amber-200"
                  >
                    Review &amp; approve
                  </Link>
                </li>
              ))}
            </ul>
          </Card>
        )}

        {pendingSelections.length > 0 && (
          <Card className="mt-4 border-amber-200/80 bg-amber-50 p-5 dark:border-amber-800/60 dark:bg-amber-950/30">
            <h2 className="text-sm font-semibold text-amber-900 dark:text-amber-200">Selections needing your choice</h2>
            <ul className="mt-2 space-y-2">
              {pendingSelections.map((s, i) => (
                <li key={i} className="flex items-center justify-between gap-3 text-sm">
                  <span className="text-amber-900 dark:text-amber-200">
                    {s.category}
                    {s.due_date && ` — due ${formatDate(s.due_date)}`}
                  </span>
                  <Link
                    href={`/select/${s.token}`}
                    className="shrink-0 font-medium text-amber-900 underline underline-offset-2 hover:text-amber-950 dark:text-amber-200"
                  >
                    View &amp; choose
                  </Link>
                </li>
              ))}
            </ul>
          </Card>
        )}

        {chosenSelections.length > 0 && (
          <Card className="mt-4 p-5">
            <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Selections chosen</h2>
            <ul className="mt-2 divide-y divide-slate-100 dark:divide-slate-800">
              {chosenSelections.map((s, i) => (
                <li key={i} className="flex items-center justify-between py-2 text-sm">
                  <span className="text-slate-900 dark:text-slate-100">{s.category}</span>
                  <span className="text-slate-500 dark:text-slate-400">{s.chosen_at ? formatDate(s.chosen_at) : ""}</span>
                </li>
              ))}
            </ul>
          </Card>
        )}

        {photos.some((_, i) => photoUrls[i]) && (
          <Card className="mt-4 p-5">
            <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Progress photos</h2>
            <div className="mt-3 grid grid-cols-3 gap-2">
              {photos.map((p, i) =>
                photoUrls[i] ? (
                  <a
                    key={i}
                    href={photoUrls[i]!}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group relative block overflow-hidden rounded-lg bg-slate-100 dark:bg-slate-800"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element -- external signed Supabase Storage URL, not a local/optimizable asset */}
                    <img
                      src={photoUrls[i]!}
                      alt={p.caption ?? `Site photo, ${formatDate(p.entry_date)}`}
                      className="aspect-square w-full object-cover transition group-hover:opacity-90"
                    />
                    <span className="absolute inset-x-0 bottom-0 bg-black/50 px-1.5 py-0.5 text-[10px] text-white">
                      {formatDate(p.entry_date)}
                    </span>
                  </a>
                ) : null
              )}
            </div>
          </Card>
        )}

        {milestones.length > 0 && (
          <Card className="mt-4 p-5">
            <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Milestones</h2>
            <ul className="mt-2 divide-y divide-slate-100 dark:divide-slate-800">
              {milestones.map((m, i) => (
                <li key={i} className="flex items-center justify-between py-2 text-sm">
                  <span className="text-slate-900 dark:text-slate-100">
                    {m.name}
                    {m.target_date && <span className="text-slate-500 dark:text-slate-400"> — target {formatDate(m.target_date)}</span>}
                  </span>
                  <Badge tone={milestoneStatusTone[m.status] ?? "neutral"}>{m.status.replace("_", " ")}</Badge>
                </li>
              ))}
            </ul>
          </Card>
        )}

        {claims.length > 0 && (
          <Card className="mt-4 p-5">
            <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Payment claims</h2>
            <ul className="mt-2 divide-y divide-slate-100 dark:divide-slate-800">
              {claims.map((c, i) => (
                <li key={i} className="flex items-center justify-between py-2 text-sm">
                  <span className="text-slate-900 dark:text-slate-100">
                    {c.claim_number ? `Claim ${c.claim_number}` : "Claim"} — {formatCurrency(c.amount_claimed)}
                    <span className="text-slate-500 dark:text-slate-400"> ({formatDate(c.claim_date)})</span>
                  </span>
                  <Badge tone={claimStatusTone[c.status] ?? "neutral"}>{c.status.replace("_", " ")}</Badge>
                </li>
              ))}
            </ul>
          </Card>
        )}

        {approvedVariations.length > 0 && (
          <Card className="mt-4 p-5">
            <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Approved variations</h2>
            <ul className="mt-2 divide-y divide-slate-100 dark:divide-slate-800">
              {approvedVariations.map((v, i) => (
                <li key={i} className="flex items-center justify-between py-2 text-sm">
                  <span className="text-slate-900 dark:text-slate-100">{v.title}</span>
                  <span className="text-slate-500 dark:text-slate-400">{v.cost_impact !== null ? formatCurrency(v.cost_impact) : ""}</span>
                </li>
              ))}
            </ul>
          </Card>
        )}

        {recentEntries.length > 0 && (
          <Card className="mt-4 p-5">
            <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Progress history</h2>
            <ul className="mt-2 max-h-80 space-y-3 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
              {recentEntries.map((e, i) => (
                <li key={i} className={i > 0 ? "pt-3" : ""}>
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{formatDate(e.entry_date)}</p>
                    {e.percent_complete !== null && (
                      <span className="text-xs text-slate-400 dark:text-slate-500">{e.percent_complete}% complete</span>
                    )}
                  </div>
                  {e.summary && <p className="mt-1 text-sm text-slate-900 dark:text-slate-100">{e.summary}</p>}
                </li>
              ))}
            </ul>
          </Card>
        )}

        {clientDocuments.some((_, i) => documentUrls[i]) && (
          <Card className="mt-4 p-5">
            <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Documents</h2>
            <ul className="mt-2 divide-y divide-slate-100 dark:divide-slate-800">
              {clientDocuments.map((d, i) =>
                documentUrls[i] ? (
                  <li key={i} className="flex items-center justify-between gap-3 py-2 text-sm">
                    <span className="text-slate-900 dark:text-slate-100">{d.title}</span>
                    <div className="flex shrink-0 items-center gap-3">
                      <Badge tone="neutral">{documentCategoryLabel[d.category] ?? d.category}</Badge>
                      <a
                        href={documentUrls[i]!}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-medium text-brand-orange hover:underline"
                      >
                        View
                      </a>
                    </div>
                  </li>
                ) : null
              )}
            </ul>
          </Card>
        )}

        <p className="mt-8 text-center text-xs text-slate-400 dark:text-slate-500">
          This is a read-only summary shared by {portal.company_name} via CivFlow.
        </p>
      </div>
    </main>
  );
}
