"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";

/**
 * Handles both cases with one component: responding to a quote the builder
 * requested (existingQuoteId set — description is fixed, just add the
 * figure/file) and submitting a fresh, unsolicited quote (no id — the
 * subbie also types what it's for). The file itself uploads straight to
 * the public `subcontractor-uploads` bucket from the browser (no server
 * route needed — storage RLS scopes the write to this token's own folder),
 * then the RPC records the row.
 */
export function QuoteForm({
  token,
  existingQuoteId,
  existingDescription,
  onDone,
}: {
  token: string;
  existingQuoteId?: string;
  existingDescription?: string;
  onDone?: () => void;
}) {
  const router = useRouter();
  const supabase = createClient();

  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [notes, setNotes] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const parsedAmount = amount.trim() ? parseFloat(amount) : null;
    if (amount.trim() && (parsedAmount === null || Number.isNaN(parsedAmount) || parsedAmount <= 0)) {
      setError("Enter a valid amount, or leave it blank.");
      return;
    }
    if (!existingQuoteId && !description.trim()) {
      setError("Say what this quote is for.");
      return;
    }

    setSaving(true);

    let storagePath: string | null = null;
    if (file) {
      const path = `${token}/quotes/${crypto.randomUUID()}-${file.name}`;
      const { error: uploadError } = await supabase.storage.from("subcontractor-uploads").upload(path, file, {
        contentType: file.type || undefined,
      });
      if (uploadError) {
        setSaving(false);
        setError(uploadError.message);
        return;
      }
      storagePath = path;
    }

    const { error: rpcError } = await supabase.rpc("submit_subcontractor_quote_by_token", {
      sub_token: token,
      target_quote_id: existingQuoteId ?? null,
      quote_description: description.trim() || null,
      quoted_amount: parsedAmount,
      quote_notes: notes.trim() || null,
      quote_storage_path: storagePath,
    });

    setSaving(false);
    if (rpcError) {
      setError(rpcError.message);
      return;
    }

    setDescription("");
    setAmount("");
    setNotes("");
    setFile(null);
    setSubmitted(true);
    router.refresh();
    onDone?.();
  }

  return (
    <form onSubmit={handleSubmit} className="mt-3 space-y-3">
      {!existingQuoteId && (
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">What&apos;s this quote for?</label>
          <input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="e.g. Additional bathroom waterproofing" className="field mt-1" />
        </div>
      )}
      {existingDescription && <p className="text-sm text-slate-700 dark:text-slate-300">{existingDescription}</p>}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Amount (AUD)</label>
          <input type="number" step="0.01" min="0" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" className="field mt-1" />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Notes (optional)</label>
          <input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Anything the builder should know" className="field mt-1" />
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Attach a file (optional)</label>
        <input
          type="file"
          accept="image/*,application/pdf"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          className="mt-1 block w-full text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-slate-100 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-slate-700 dark:text-slate-400 dark:file:bg-slate-800 dark:file:text-slate-300"
        />
      </div>
      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
      {submitted && !error && <p className="text-sm text-emerald-600 dark:text-emerald-400">Quote sent — the builder will review it.</p>}
      <Button type="submit" size="sm" loading={saving}>Submit quote</Button>
    </form>
  );
}
