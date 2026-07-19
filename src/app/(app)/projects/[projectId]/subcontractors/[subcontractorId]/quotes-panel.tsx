"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Subcontractor, SubcontractorQuote, SubcontractorQuoteItem } from "@/types/database";
import { Card } from "@/components/ui/card";
import { Badge, BadgeTone } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const statusTone: Record<string, BadgeTone> = {
  requested: "amber",
  received: "blue",
  accepted: "emerald",
  declined: "neutral",
};

function toDateInput(d: Date) {
  return d.toISOString().slice(0, 10);
}

function formatCurrency(n: number) {
  return n.toLocaleString(undefined, { style: "currency", currency: "AUD" });
}

export function QuotesPanel({
  subcontractor,
  quotes,
  itemsByQuoteId,
}: {
  subcontractor: Subcontractor;
  quotes: SubcontractorQuote[];
  itemsByQuoteId?: Map<string, Pick<SubcontractorQuoteItem, "id" | "description" | "amount" | "item_date">[] | null>;
}) {
  const router = useRouter();
  const supabase = createClient();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function fileUrl(path: string) {
    return supabase.storage.from("subcontractor-uploads").getPublicUrl(path).data.publicUrl;
  }

  const [adding, setAdding] = useState(false);
  const [description, setDescription] = useState("");

  const [recordingId, setRecordingId] = useState<string | null>(null);
  const [amountInput, setAmountInput] = useState("");

  async function addQuote(e: React.FormEvent) {
    e.preventDefault();
    if (!description.trim()) return;
    setSaving(true);
    setError(null);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { error } = await supabase.from("subcontractor_quotes").insert({
      subcontractor_id: subcontractor.id,
      project_id: subcontractor.project_id,
      description: description.trim(),
      created_by: user?.id ?? null,
      status: "requested",
    });

    setSaving(false);
    if (error) {
      setError(error.message);
      return;
    }
    setDescription("");
    setAdding(false);
    router.refresh();
  }

  async function recordAmount(quoteId: string) {
    const amount = parseFloat(amountInput);
    if (Number.isNaN(amount)) return;
    setSaving(true);
    setError(null);
    const { error } = await supabase
      .from("subcontractor_quotes")
      .update({ amount, status: "received", received_date: toDateInput(new Date()) })
      .eq("id", quoteId);
    setSaving(false);
    if (error) {
      setError(error.message);
      return;
    }
    setRecordingId(null);
    setAmountInput("");
    router.refresh();
  }

  async function decline(quoteId: string) {
    setSaving(true);
    setError(null);
    const { error } = await supabase.from("subcontractor_quotes").update({ status: "declined" }).eq("id", quoteId);
    setSaving(false);
    if (error) {
      setError(error.message);
      return;
    }
    router.refresh();
  }

  async function accept(quote: SubcontractorQuote) {
    setSaving(true);
    setError(null);

    const { error: quoteError } = await supabase.from("subcontractor_quotes").update({ status: "accepted" }).eq("id", quote.id);
    if (quoteError) {
      setSaving(false);
      setError(quoteError.message);
      return;
    }

    // Awarding a quote moves the subcontract forward — only touch fields
    // that aren't already set, so this never clobbers a manual edit.
    const patch: { status?: "awarded"; contract_value?: number } = {};
    if (subcontractor.status === "quoting") patch.status = "awarded";
    if (subcontractor.contract_value === null && quote.amount !== null) patch.contract_value = quote.amount;
    if (Object.keys(patch).length) {
      await supabase.from("subcontractors").update(patch).eq("id", subcontractor.id);
    }

    setSaving(false);
    router.refresh();
  }

  return (
    <div>
      {error && <p className="mb-2 text-sm text-red-600 dark:text-red-400">{error}</p>}
      <Card className="divide-y divide-slate-100 overflow-hidden p-0 dark:divide-slate-800/80">
        {quotes.map((q) => {
          const items = itemsByQuoteId?.get(q.id) ?? [];
          return (
          <div key={q.id} className="px-4 py-3">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-sm text-slate-900 dark:text-slate-100">{q.description}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {q.amount !== null ? formatCurrency(q.amount) : "Awaiting amount"} · requested {q.requested_date}
                  {q.submitted_via_portal && " · via subcontractor portal"}
                </p>
                {q.storage_path && (
                  <a href={fileUrl(q.storage_path)} target="_blank" rel="noopener noreferrer" className="text-xs font-medium text-brand-orange hover:underline">
                    View attached file
                  </a>
                )}
              </div>
              <Badge tone={statusTone[q.status]} className="shrink-0">{q.status}</Badge>
            </div>

            {items.length > 0 && (
              <div className="mt-2 rounded-lg border border-slate-100 bg-slate-50/60 px-3 py-2 dark:border-slate-800 dark:bg-slate-900/40">
                <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400 dark:text-slate-500">
                  Itemised — {items.length} line{items.length === 1 ? "" : "s"}
                </p>
                <ul className="mt-1 space-y-1">
                  {items.map((item) => (
                    <li key={item.id} className="flex items-start justify-between gap-3 text-xs text-slate-600 dark:text-slate-300">
                      <span className="min-w-0 flex-1">
                        {item.description}
                        {item.item_date && <span className="text-slate-400 dark:text-slate-500"> · {item.item_date}</span>}
                      </span>
                      <span className="shrink-0 tabular-nums">{item.amount !== null ? formatCurrency(item.amount) : "—"}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {q.status === "requested" && recordingId !== q.id && (
              <button type="button" onClick={() => setRecordingId(q.id)} className="mt-2 text-xs font-medium text-brand-orange hover:underline">
                Record amount received
              </button>
            )}
            {recordingId === q.id && (
              <div className="mt-2 flex items-center gap-2">
                <input
                  type="number"
                  step="0.01"
                  value={amountInput}
                  onChange={(e) => setAmountInput(e.target.value)}
                  placeholder="Amount (AUD)"
                  className="field !w-auto flex-1 !py-1.5 text-xs"
                />
                <Button size="sm" loading={saving} onClick={() => recordAmount(q.id)}>Save</Button>
                <button type="button" onClick={() => setRecordingId(null)} className="text-xs text-slate-500 hover:underline dark:text-slate-400">Cancel</button>
              </div>
            )}

            {q.status === "received" && (
              <div className="mt-2 flex gap-3">
                <button type="button" onClick={() => accept(q)} disabled={saving} className="text-xs font-medium text-emerald-600 hover:underline disabled:opacity-50 dark:text-emerald-400">
                  Accept — award subcontract
                </button>
                <button type="button" onClick={() => decline(q.id)} disabled={saving} className="text-xs font-medium text-slate-400 hover:underline disabled:opacity-50">
                  Decline
                </button>
              </div>
            )}
          </div>
          );
        })}
        {!quotes.length && <p className="px-4 py-6 text-center text-sm text-slate-500 dark:text-slate-400">No quotes requested yet.</p>}
      </Card>

      {adding ? (
        <form onSubmit={addQuote} className="mt-3 space-y-2 rounded-xl border border-slate-200 p-3 dark:border-slate-800">
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What's being quoted?"
            required
            className="field text-sm"
          />
          <div className="flex gap-2">
            <Button type="submit" size="sm" loading={saving}>Request quote</Button>
            <button type="button" onClick={() => setAdding(false)} className="text-xs text-slate-500 hover:underline dark:text-slate-400">Cancel</button>
          </div>
        </form>
      ) : (
        <button type="button" onClick={() => setAdding(true)} className="mt-3 text-sm font-medium text-brand-orange hover:underline">
          + Request quote
        </button>
      )}
    </div>
  );
}
