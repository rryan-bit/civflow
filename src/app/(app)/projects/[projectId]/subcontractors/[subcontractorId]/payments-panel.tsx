"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Subcontractor, SubcontractorPayment } from "@/types/database";
import { Card } from "@/components/ui/card";
import { Badge, BadgeTone } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const statusTone: Record<string, BadgeTone> = {
  submitted: "amber",
  approved: "blue",
  paid: "emerald",
  disputed: "red",
};

function toDateInput(d: Date) {
  return d.toISOString().slice(0, 10);
}

function formatCurrency(n: number) {
  return n.toLocaleString(undefined, { style: "currency", currency: "AUD" });
}

export function PaymentsPanel({ subcontractor, payments }: { subcontractor: Subcontractor; payments: SubcontractorPayment[] }) {
  const router = useRouter();
  const supabase = createClient();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [adding, setAdding] = useState(false);
  const [amountClaimed, setAmountClaimed] = useState("");
  const [claimNumber, setClaimNumber] = useState("");

  const [payingId, setPayingId] = useState<string | null>(null);
  const [paidAmount, setPaidAmount] = useState("");

  const retentionPct = subcontractor.retention_percentage ?? 0;

  const totalClaimed = payments.reduce((sum, p) => sum + p.amount_claimed, 0);
  const totalPaid = payments.reduce((sum, p) => sum + (p.amount_paid ?? 0), 0);
  const totalRetentionHeld = payments.reduce((sum, p) => sum + p.retention_held, 0);

  async function addPayment(e: React.FormEvent) {
    e.preventDefault();
    const amount = parseFloat(amountClaimed);
    if (Number.isNaN(amount) || amount <= 0) return;
    setSaving(true);
    setError(null);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    const retention = Math.round(amount * (retentionPct / 100) * 100) / 100;

    const { error } = await supabase.from("subcontractor_payments").insert({
      subcontractor_id: subcontractor.id,
      project_id: subcontractor.project_id,
      claim_number: claimNumber.trim() || null,
      amount_claimed: amount,
      retention_held: retention,
      created_by: user?.id ?? null,
      status: "submitted",
    });

    setSaving(false);
    if (error) {
      setError(error.message);
      return;
    }
    setAmountClaimed("");
    setClaimNumber("");
    setAdding(false);
    router.refresh();
  }

  async function approve(id: string) {
    setSaving(true);
    setError(null);
    const { error } = await supabase.from("subcontractor_payments").update({ status: "approved" }).eq("id", id);
    setSaving(false);
    if (error) {
      setError(error.message);
      return;
    }
    router.refresh();
  }

  async function markPaid(payment: SubcontractorPayment) {
    const amount = parseFloat(paidAmount);
    if (Number.isNaN(amount)) return;
    setSaving(true);
    setError(null);
    const { error } = await supabase
      .from("subcontractor_payments")
      .update({ status: "paid", amount_paid: amount, paid_date: toDateInput(new Date()) })
      .eq("id", payment.id);
    setSaving(false);
    if (error) {
      setError(error.message);
      return;
    }
    setPayingId(null);
    setPaidAmount("");
    router.refresh();
  }

  return (
    <div>
      {payments.length > 0 && (
        <div className="mb-3 flex flex-wrap gap-2">
          <Badge tone="neutral">Claimed: {formatCurrency(totalClaimed)}</Badge>
          <Badge tone="emerald">Paid: {formatCurrency(totalPaid)}</Badge>
          <Badge tone="amber">Retention held: {formatCurrency(totalRetentionHeld)}</Badge>
        </div>
      )}

      {error && <p className="mb-2 text-sm text-red-600 dark:text-red-400">{error}</p>}

      <Card className="divide-y divide-slate-100 overflow-hidden p-0 dark:divide-slate-800/80">
        {payments.map((p) => (
          <div key={p.id} className="px-4 py-3">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-sm text-slate-900 dark:text-slate-100">
                  {p.claim_number ? `Claim ${p.claim_number}` : "Claim"} — {formatCurrency(p.amount_claimed)}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Claimed {p.claim_date} · retention {formatCurrency(p.retention_held)}
                  {p.amount_paid !== null && ` · paid ${formatCurrency(p.amount_paid)}`}
                </p>
              </div>
              <Badge tone={statusTone[p.status]} className="shrink-0">{p.status}</Badge>
            </div>

            {p.status === "submitted" && (
              <button type="button" onClick={() => approve(p.id)} disabled={saving} className="mt-2 text-xs font-medium text-brand-orange hover:underline disabled:opacity-50">
                Approve
              </button>
            )}

            {p.status === "approved" && payingId !== p.id && (
              <button type="button" onClick={() => { setPayingId(p.id); setPaidAmount((p.amount_claimed - p.retention_held).toString()); }} className="mt-2 text-xs font-medium text-emerald-600 hover:underline dark:text-emerald-400">
                Mark paid
              </button>
            )}
            {payingId === p.id && (
              <div className="mt-2 flex items-center gap-2">
                <input
                  type="number"
                  step="0.01"
                  value={paidAmount}
                  onChange={(e) => setPaidAmount(e.target.value)}
                  className="field !w-auto flex-1 !py-1.5 text-xs"
                />
                <Button size="sm" loading={saving} className="!bg-emerald-600 hover:!bg-emerald-700" onClick={() => markPaid(p)}>Save</Button>
                <button type="button" onClick={() => setPayingId(null)} className="text-xs text-slate-500 hover:underline dark:text-slate-400">Cancel</button>
              </div>
            )}
          </div>
        ))}
        {!payments.length && <p className="px-4 py-6 text-center text-sm text-slate-500 dark:text-slate-400">No payment claims recorded yet.</p>}
      </Card>

      {adding ? (
        <form onSubmit={addPayment} className="mt-3 space-y-2 rounded-xl border border-slate-200 p-3 dark:border-slate-800">
          <div className="flex gap-2">
            <input
              type="text"
              value={claimNumber}
              onChange={(e) => setClaimNumber(e.target.value)}
              placeholder="Claim # (optional)"
              className="field !w-auto flex-1 text-sm"
            />
            <input
              type="number"
              step="0.01"
              value={amountClaimed}
              onChange={(e) => setAmountClaimed(e.target.value)}
              placeholder="Amount claimed (AUD)"
              required
              className="field !w-auto flex-1 text-sm"
            />
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">{retentionPct}% retention (${((parseFloat(amountClaimed) || 0) * (retentionPct / 100)).toFixed(2)}) will be withheld automatically.</p>
          <div className="flex gap-2">
            <Button type="submit" size="sm" loading={saving}>Add claim</Button>
            <button type="button" onClick={() => setAdding(false)} className="text-xs text-slate-500 hover:underline dark:text-slate-400">Cancel</button>
          </div>
        </form>
      ) : (
        <button type="button" onClick={() => setAdding(true)} className="mt-3 text-sm font-medium text-brand-orange hover:underline">
          + Add payment claim
        </button>
      )}
    </div>
  );
}
