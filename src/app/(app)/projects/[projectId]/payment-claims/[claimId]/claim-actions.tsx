"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { PaymentClaim } from "@/types/database";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

function toDateInput(d: Date) {
  return d.toISOString().slice(0, 10);
}

export function ClaimActions({ claim }: { claim: PaymentClaim }) {
  const router = useRouter();
  const supabase = createClient();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<"none" | "schedule" | "paid">("none");

  const [scheduledAmount, setScheduledAmount] = useState(claim.amount_claimed.toString());
  const [scheduledDate, setScheduledDate] = useState(toDateInput(new Date()));
  const [paidAmount, setPaidAmount] = useState((claim.scheduled_amount ?? claim.amount_claimed).toString());
  const [paidDate, setPaidDate] = useState(toDateInput(new Date()));

  async function markDisputed() {
    setSaving(true);
    setError(null);
    const { error } = await supabase.from("payment_claims").update({ status: "disputed" }).eq("id", claim.id);
    setSaving(false);
    if (error) {
      setError(error.message);
      return;
    }
    router.refresh();
  }

  async function submitSchedule(e: React.FormEvent) {
    e.preventDefault();
    const amount = parseFloat(scheduledAmount);
    if (Number.isNaN(amount)) return;
    setSaving(true);
    setError(null);
    const { error } = await supabase
      .from("payment_claims")
      .update({ status: "schedule_received", scheduled_amount: amount, scheduled_date: scheduledDate })
      .eq("id", claim.id);
    setSaving(false);
    if (error) {
      setError(error.message);
      return;
    }
    setMode("none");
    router.refresh();
  }

  async function submitPaid(e: React.FormEvent) {
    e.preventDefault();
    const amount = parseFloat(paidAmount);
    if (Number.isNaN(amount)) return;
    setSaving(true);
    setError(null);
    const { error } = await supabase
      .from("payment_claims")
      .update({ status: "paid", paid_amount: amount, paid_date: paidDate })
      .eq("id", claim.id);
    setSaving(false);
    if (error) {
      setError(error.message);
      return;
    }
    setMode("none");
    router.refresh();
  }

  if (claim.status === "paid") return null;

  return (
    <Card className="p-5">
      {error && <p className="mb-2 text-sm text-red-600 dark:text-red-400">{error}</p>}

      {mode === "none" && (
        <div className="flex flex-wrap gap-2">
          {claim.status === "submitted" && (
            <Button onClick={() => setMode("schedule")} loading={saving}>
              Record payment schedule
            </Button>
          )}
          <Button onClick={() => setMode("paid")} loading={saving} className="!bg-emerald-600 hover:!bg-emerald-700">
            Mark paid
          </Button>
          {claim.status !== "disputed" && (
            <Button variant="outline" onClick={markDisputed} loading={saving}>
              Mark disputed
            </Button>
          )}
        </div>
      )}

      {mode === "schedule" && (
        <form onSubmit={submitSchedule} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Scheduled amount (AUD)</label>
              <input type="number" step="0.01" value={scheduledAmount} onChange={(e) => setScheduledAmount(e.target.value)} required className="field mt-1" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Date received</label>
              <input type="date" value={scheduledDate} onChange={(e) => setScheduledDate(e.target.value)} required className="field mt-1" />
            </div>
          </div>
          <div className="flex gap-2">
            <Button type="submit" loading={saving}>Save</Button>
            <button type="button" onClick={() => setMode("none")} className="text-sm text-slate-500 hover:underline dark:text-slate-400">Cancel</button>
          </div>
        </form>
      )}

      {mode === "paid" && (
        <form onSubmit={submitPaid} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Paid amount (AUD)</label>
              <input type="number" step="0.01" value={paidAmount} onChange={(e) => setPaidAmount(e.target.value)} required className="field mt-1" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Date paid</label>
              <input type="date" value={paidDate} onChange={(e) => setPaidDate(e.target.value)} required className="field mt-1" />
            </div>
          </div>
          <div className="flex gap-2">
            <Button type="submit" loading={saving} className="!bg-emerald-600 hover:!bg-emerald-700">Save</Button>
            <button type="button" onClick={() => setMode("none")} className="text-sm text-slate-500 hover:underline dark:text-slate-400">Cancel</button>
          </div>
        </form>
      )}
    </Card>
  );
}
