"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { checkDepositCap } from "@/lib/financial-calcs";

const HOME_WARRANTY_THRESHOLD = 3300;

export function ContractForm({
  projectId,
  contractValue,
  depositAmount,
  startDate,
  contractedCompletionDate,
  homeWarrantyPremiumPaid,
  homeWarrantyPremiumPaidDate,
}: {
  projectId: string;
  contractValue: number | null;
  depositAmount: number | null;
  startDate: string | null;
  contractedCompletionDate: string | null;
  homeWarrantyPremiumPaid: boolean;
  homeWarrantyPremiumPaidDate: string | null;
}) {
  const router = useRouter();
  const supabase = createClient();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [value, setValue] = useState(contractValue?.toString() ?? "");
  const [deposit, setDeposit] = useState(depositAmount?.toString() ?? "");
  const [start, setStart] = useState(startDate ?? "");
  const [contractedCompletion, setContractedCompletion] = useState(contractedCompletionDate ?? "");
  const [premiumPaid, setPremiumPaid] = useState(homeWarrantyPremiumPaid);
  const [premiumPaidDate, setPremiumPaidDate] = useState(homeWarrantyPremiumPaidDate ?? "");

  const parsedValue = value ? parseFloat(value) : null;
  const parsedDeposit = deposit ? parseFloat(deposit) : null;
  const { breached: depositBreach, percent: depositPercent, capRate } = checkDepositCap(parsedValue, parsedDeposit);
  const needsHomeWarranty = typeof parsedValue === "number" && parsedValue > HOME_WARRANTY_THRESHOLD;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const { error } = await supabase
      .from("projects")
      .update({
        contract_value: value ? parseFloat(value) : null,
        deposit_amount: deposit ? parseFloat(deposit) : null,
        start_date: start || null,
        contracted_completion_date: contractedCompletion || null,
        home_warranty_premium_paid: premiumPaid,
        home_warranty_premium_paid_date: premiumPaid ? premiumPaidDate || null : null,
      })
      .eq("id", projectId);

    setSaving(false);
    if (error) {
      setError(error.message);
      return;
    }
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      <div>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Original contract value (AUD)</label>
        <input type="number" step="0.01" value={value} onChange={(e) => setValue(e.target.value)} className="field mt-1" />
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Deposit taken (AUD)</label>
        <input type="number" step="0.01" value={deposit} onChange={(e) => setDeposit(e.target.value)} className="field mt-1" />
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Start date</label>
        <input type="date" value={start} onChange={(e) => setStart(e.target.value)} className="field mt-1" />
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Contracted completion date</label>
        <input type="date" value={contractedCompletion} onChange={(e) => setContractedCompletion(e.target.value)} className="field mt-1" />
      </div>

      {needsHomeWarranty && (
        <div className="sm:col-span-3 rounded-lg border border-slate-200 p-3 dark:border-slate-800">
          <label className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300">
            <input type="checkbox" checked={premiumPaid} onChange={(e) => setPremiumPaid(e.target.checked)} className="h-4 w-4 rounded" />
            Home Warranty Insurance premium remitted to QBCC
          </label>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Required on residential contracts over $3,300 — collected as part of the deposit and remitted within 10
            business days of signing.
          </p>
          {premiumPaid && (
            <input
              type="date"
              value={premiumPaidDate}
              onChange={(e) => setPremiumPaidDate(e.target.value)}
              className="field mt-2 w-auto"
            />
          )}
        </div>
      )}

      <div className="sm:col-span-3">
        {depositBreach && depositPercent !== null && capRate !== null && (
          <p className="mb-2 text-sm text-red-600 dark:text-red-400">
            This deposit is {depositPercent.toFixed(1)}% of the contract value — over the {capRate}% cap for
            domestic building contracts at this value (QBCC Act Schedule 1B).
          </p>
        )}
        {error && <p className="mb-2 text-sm text-red-600 dark:text-red-400">{error}</p>}
        <Button type="submit" size="sm" loading={saving}>Save</Button>
      </div>
    </form>
  );
}
