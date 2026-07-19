"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

function toDateInput(d: Date) {
  return d.toISOString().slice(0, 10);
}

function addBusinessDays(date: Date, days: number) {
  const d = new Date(date);
  let added = 0;
  while (added < days) {
    d.setDate(d.getDate() + 1);
    const day = d.getDay();
    if (day !== 0 && day !== 6) added++;
  }
  return d;
}

const today = toDateInput(new Date());
const defaultScheduleDue = toDateInput(addBusinessDays(new Date(), 15));
const defaultDue = toDateInput(addBusinessDays(new Date(), 15));

export function NewPaymentClaimForm({ projectId }: { projectId: string }) {
  const router = useRouter();
  const supabase = createClient();

  const [claimNumber, setClaimNumber] = useState("");
  const [claimDate, setClaimDate] = useState(today);
  const [amountClaimed, setAmountClaimed] = useState("");
  const [dueDate, setDueDate] = useState(defaultDue);
  const [scheduleDueDate, setScheduleDueDate] = useState(defaultScheduleDue);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const amount = parseFloat(amountClaimed);
    if (!amount || amount <= 0) return;
    setSaving(true);
    setError(null);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { data, error } = await supabase
      .from("payment_claims")
      .insert({
        project_id: projectId,
        claim_number: claimNumber.trim() || null,
        claim_date: claimDate,
        amount_claimed: amount,
        due_date: dueDate,
        schedule_due_date: scheduleDueDate || null,
        notes: notes.trim() || null,
        created_by: user?.id ?? null,
        status: "submitted",
      })
      .select("id")
      .single();

    setSaving(false);

    if (error || !data) {
      setError(error?.message ?? "Couldn't create the payment claim.");
      return;
    }

    router.push(`/projects/${projectId}/payment-claims/${data.id}`);
    router.refresh();
  }

  return (
    <Card className="p-5">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Claim number (optional)</label>
            <input type="text" value={claimNumber} onChange={(e) => setClaimNumber(e.target.value)} placeholder="e.g. PC-014" className="field mt-1" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Claim date</label>
            <input type="date" value={claimDate} onChange={(e) => setClaimDate(e.target.value)} className="field mt-1" />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Amount claimed (AUD)</label>
          <input
            type="number"
            step="0.01"
            min="0"
            value={amountClaimed}
            onChange={(e) => setAmountClaimed(e.target.value)}
            required
            placeholder="0.00"
            className="field mt-1"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Payment due date</label>
            <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} required className="field mt-1" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Payment schedule due</label>
            <input type="date" value={scheduleDueDate} onChange={(e) => setScheduleDueDate(e.target.value)} className="field mt-1" />
          </div>
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Defaults are 15 business days out — the BIF Act maximum for commercial contracts (up to 25 for subcontracts) and
          the maximum time a respondent has to issue a payment schedule. Check your contract for an earlier date and adjust
          if needed.
        </p>

        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Notes (optional)</label>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} placeholder="Reference to the claim document, scope covered, etc." className="field mt-1" />
        </div>

        {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

        <Button type="submit" loading={saving}>
          {saving ? "Creating…" : "Create Payment Claim"}
        </Button>
      </form>
    </Card>
  );
}
