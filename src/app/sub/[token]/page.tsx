import ThemeToggle from "@/components/theme-toggle";
import { LogoMark } from "@/components/logo";
import { Card } from "@/components/ui/card";
import { Badge, BadgeTone } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase/server";
import ComplianceForm from "./compliance-form";
import ClaimForm from "./claim-form";
import SwmsAcknowledgeButton from "./swms-acknowledge-button";
import { RequestedQuoteItem } from "./requested-quote-item";
import { QuoteForm } from "./quote-form";
import { UpdateForm } from "./update-form";
import { SubcontractorChatThread } from "./sub-chat";
import type { ChatMessageItem } from "@/components/chat/chat-thread";

const quoteStatusTone: Record<string, BadgeTone> = {
  requested: "amber",
  received: "blue",
  accepted: "emerald",
  declined: "neutral",
};

const updateTypeLabel: Record<string, string> = {
  general: "Update",
  delay_or_issue: "Delay or issue",
  stage_complete: "Stage complete",
};

const paymentStatusTone: Record<string, BadgeTone> = {
  submitted: "amber",
  approved: "blue",
  paid: "emerald",
  disputed: "red",
};

const swmsStatusTone: Record<string, BadgeTone> = {
  current: "emerald",
  review_due: "amber",
  expired: "red",
  superseded: "neutral",
};

function formatCurrency(n: number | null) {
  if (n === null) return "—";
  return n.toLocaleString(undefined, { style: "currency", currency: "AUD", maximumFractionDigits: 0 });
}

function formatDate(d: string | null | undefined) {
  if (!d) return null;
  return new Date(d).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

function daysUntil(d: string): number {
  return Math.round((new Date(d).getTime() - new Date().setHours(0, 0, 0, 0)) / (1000 * 60 * 60 * 24));
}

export default async function SubcontractorPortalPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const supabase = await createClient();

  const { data: sub } = await supabase.rpc("get_subcontractor_portal_data", { sub_token: token });

  if (!sub?.is_valid) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="surface-card max-w-sm p-8 text-center" style={{ boxShadow: "var(--shadow-elevated)" }}>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            This link isn&apos;t valid. Ask the builder to check the link they sent you.
          </p>
        </div>
      </main>
    );
  }

  const payments = sub.payments ?? [];
  const swmsList = sub.swms ?? [];
  const quotes = sub.quotes ?? [];
  const updates = sub.updates ?? [];
  const requestedQuotes = quotes.filter((q) => q.status === "requested");
  const submittedQuotes = quotes.filter((q) => q.status !== "requested");

  const publicUrl = (path: string | null) =>
    path ? supabase.storage.from("subcontractor-uploads").getPublicUrl(path).data.publicUrl : null;

  const { data: chatData } = await supabase.rpc("get_subcontractor_chat_by_token", { sub_token: token });
  const chatMessages: ChatMessageItem[] = (chatData?.messages ?? []).map((m) => ({
    id: m.id,
    body: m.body,
    createdAt: m.created_at,
    senderName: m.sender_name,
    isMe: m.is_me,
  }));

  const insuranceDays = sub.insurance_expiry ? daysUntil(sub.insurance_expiry) : null;
  const licenceDays = sub.licence_expiry ? daysUntil(sub.licence_expiry) : null;

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
            {sub.builder_company_name} · {sub.project_name}
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">{sub.company_name}</h1>
          <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
            {sub.trade}
            {sub.site_address && ` — ${sub.site_address}`}
          </p>
        </div>

        <Card className="mt-6 p-5">
          <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Your contract</h2>
          <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
            <div>
              <dt className="text-xs text-slate-500 dark:text-slate-400">Contract value</dt>
              <dd className="mt-0.5 font-medium text-slate-900 dark:text-slate-100">{formatCurrency(sub.contract_value ?? null)}</dd>
            </div>
            <div>
              <dt className="text-xs text-slate-500 dark:text-slate-400">Status</dt>
              <dd className="mt-0.5 font-medium text-slate-900 dark:text-slate-100">{sub.status?.replace("_", " ")}</dd>
            </div>
            {sub.start_date && (
              <div>
                <dt className="text-xs text-slate-500 dark:text-slate-400">Start date</dt>
                <dd className="mt-0.5 font-medium text-slate-900 dark:text-slate-100">{formatDate(sub.start_date)}</dd>
              </div>
            )}
            {sub.retention_percentage ? (
              <div>
                <dt className="text-xs text-slate-500 dark:text-slate-400">Retention held</dt>
                <dd className="mt-0.5 font-medium text-slate-900 dark:text-slate-100">
                  {sub.retention_percentage}%
                  {sub.retention_released_date && ` — released ${formatDate(sub.retention_released_date)}`}
                </dd>
              </div>
            ) : null}
          </dl>
        </Card>

        <Card className="mt-4 p-5">
          <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Your compliance details</h2>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Keep these current — the builder is notified if either lapses.
          </p>
          {insuranceDays !== null && insuranceDays < 30 && (
            <p className={`mt-2 text-xs ${insuranceDays < 0 ? "text-red-600 dark:text-red-400" : "text-amber-600 dark:text-amber-400"}`}>
              Insurance {insuranceDays < 0 ? `expired ${Math.abs(insuranceDays)}d ago` : `expires in ${insuranceDays}d`}.
            </p>
          )}
          {licenceDays !== null && licenceDays < 30 && (
            <p className={`mt-1 text-xs ${licenceDays < 0 ? "text-red-600 dark:text-red-400" : "text-amber-600 dark:text-amber-400"}`}>
              Licence {licenceDays < 0 ? `expired ${Math.abs(licenceDays)}d ago` : `expires in ${licenceDays}d`}.
            </p>
          )}
          <ComplianceForm token={token} insuranceExpiry={sub.insurance_expiry ?? null} licenceExpiry={sub.licence_expiry ?? null} />
        </Card>

        {swmsList.length > 0 && (
          <Card className="mt-4 p-5">
            <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Safe Work Method Statements</h2>
            <ul className="mt-2 divide-y divide-slate-100 dark:divide-slate-800">
              {swmsList.map((w) => (
                <li key={w.id} className="flex items-center justify-between gap-3 py-3 text-sm">
                  <div className="min-w-0">
                    <p className="truncate text-slate-900 dark:text-slate-100">{w.title}</p>
                    <div className="mt-1 flex items-center gap-2">
                      <Badge tone={swmsStatusTone[w.status] ?? "neutral"}>{w.status.replace("_", " ")}</Badge>
                      {w.acknowledged_at && (
                        <span className="text-xs text-slate-500 dark:text-slate-400">Read {formatDate(w.acknowledged_at)}</span>
                      )}
                    </div>
                  </div>
                  {!w.acknowledged_at && <SwmsAcknowledgeButton token={token} swmsId={w.id} />}
                </li>
              ))}
            </ul>
          </Card>
        )}

        <Card className="mt-4 p-5">
          <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Submit a progress claim</h2>
          <ClaimForm token={token} />
        </Card>

        {payments.length > 0 && (
          <Card className="mt-4 p-5">
            <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Your claims</h2>
            <ul className="mt-2 divide-y divide-slate-100 dark:divide-slate-800">
              {payments.map((p) => (
                <li key={p.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                  <span className="text-slate-900 dark:text-slate-100">
                    {p.claim_number ? `Claim ${p.claim_number}` : "Claim"} — {formatCurrency(p.amount_claimed)}
                    <span className="text-slate-500 dark:text-slate-400"> ({formatDate(p.claim_date)})</span>
                  </span>
                  <Badge tone={paymentStatusTone[p.status] ?? "neutral"}>{p.status}</Badge>
                </li>
              ))}
            </ul>
          </Card>
        )}

        {requestedQuotes.length > 0 && (
          <Card className="mt-4 p-5">
            <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Quotes requested by the builder</h2>
            <ul className="mt-1 divide-y divide-slate-100 dark:divide-slate-800">
              {requestedQuotes.map((q) => (
                <RequestedQuoteItem key={q.id} token={token} quoteId={q.id} description={q.description} />
              ))}
            </ul>
          </Card>
        )}

        <Card className="mt-4 p-5">
          <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Submit a quote</h2>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">For anything not already requested above.</p>
          <QuoteForm token={token} />
        </Card>

        {submittedQuotes.length > 0 && (
          <Card className="mt-4 p-5">
            <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Your quotes</h2>
            <ul className="mt-2 divide-y divide-slate-100 dark:divide-slate-800">
              {submittedQuotes.map((q) => (
                <li key={q.id} className="py-2.5 text-sm">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-slate-900 dark:text-slate-100">
                      {q.description}
                      {q.amount !== null && <span className="text-slate-500 dark:text-slate-400"> — {formatCurrency(q.amount)}</span>}
                    </span>
                    <Badge tone={quoteStatusTone[q.status] ?? "neutral"}>{q.status}</Badge>
                  </div>
                  {q.storage_path && (
                    <a href={publicUrl(q.storage_path) ?? "#"} target="_blank" rel="noopener noreferrer" className="text-xs font-medium text-brand-orange hover:underline">
                      View attached file
                    </a>
                  )}
                </li>
              ))}
            </ul>
          </Card>
        )}

        <Card className="mt-4 p-5">
          <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Post an update</h2>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            A quick note for the builder — a delay, a finished stage, or anything else worth flagging.
          </p>
          <UpdateForm token={token} />
        </Card>

        {updates.length > 0 && (
          <Card className="mt-4 p-5">
            <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Your recent updates</h2>
            <ul className="mt-2 divide-y divide-slate-100 dark:divide-slate-800">
              {updates.map((u) => (
                <li key={u.id} className="py-2.5 text-sm">
                  <div className="flex items-center gap-2">
                    <Badge tone={u.update_type === "delay_or_issue" ? "amber" : "neutral"}>{updateTypeLabel[u.update_type] ?? "Update"}</Badge>
                    <span className="text-xs text-slate-500 dark:text-slate-400">{formatDate(u.created_at)}</span>
                  </div>
                  <p className="mt-1 text-slate-900 dark:text-slate-100">{u.message}</p>
                  {u.photo_storage_path && (
                    <a href={publicUrl(u.photo_storage_path) ?? "#"} target="_blank" rel="noopener noreferrer" className="text-xs font-medium text-brand-orange hover:underline">
                      View photo
                    </a>
                  )}
                </li>
              ))}
            </ul>
          </Card>
        )}

        {chatData?.is_participant && (
          <Card className="mt-4 p-5">
            <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Chat with {sub.builder_company_name}</h2>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">You&apos;ve been added to this project&apos;s chat.</p>
            <div className="mt-3">
              <SubcontractorChatThread token={token} messages={chatMessages} />
            </div>
          </Card>
        )}

        <p className="mt-8 text-center text-xs text-slate-400 dark:text-slate-500">
          This is a private link shared by {sub.builder_company_name} via CivFlow — don&apos;t forward it.
        </p>
      </div>
    </main>
  );
}
