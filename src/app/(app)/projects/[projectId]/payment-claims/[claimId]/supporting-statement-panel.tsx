"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { PaymentClaim } from "@/types/database";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type OutstandingPayment = {
  id: string;
  amount_claimed: number;
  status: string;
  subcontractorName: string;
};

function formatCurrency(n: number) {
  return n.toLocaleString(undefined, { style: "currency", currency: "AUD" });
}

export function SupportingStatementPanel({
  claim,
  outstandingPayments,
}: {
  claim: PaymentClaim;
  outstandingPayments: OutstandingPayment[];
}) {
  const router = useRouter();
  const supabase = createClient();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hasOutstanding = outstandingPayments.length > 0;

  async function toggle() {
    setSaving(true);
    setError(null);
    const { error } = await supabase
      .from("payment_claims")
      .update({ supporting_statement_provided: !claim.supporting_statement_provided })
      .eq("id", claim.id);
    setSaving(false);
    if (error) {
      setError(error.message);
      return;
    }
    router.refresh();
  }

  return (
    <Card className="mt-4 p-5">
      <h2 className="text-sm font-medium text-slate-700 dark:text-slate-300">Supporting statement</h2>
      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
        Under the BIF Act, head contractors on non-residential contracts must give the principal a supporting
        statement with each payment claim declaring that all subcontractors have been paid, or disclosing who
        hasn&apos;t and why.
      </p>

      {hasOutstanding && (
        <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-900/40 dark:bg-amber-900/10">
          <p className="text-xs font-medium text-amber-800 dark:text-amber-300">
            {outstandingPayments.length} subcontractor payment{outstandingPayments.length === 1 ? "" : "s"} on this
            project {outstandingPayments.length === 1 ? "isn't" : "aren't"} marked paid yet:
          </p>
          <ul className="mt-2 space-y-1">
            {outstandingPayments.map((p) => (
              <li key={p.id} className="flex items-center justify-between gap-2 text-xs text-amber-900 dark:text-amber-200">
                <span className="truncate">{p.subcontractorName} — {formatCurrency(p.amount_claimed)}</span>
                <Badge tone="amber" className="shrink-0">{p.status}</Badge>
              </li>
            ))}
          </ul>
        </div>
      )}

      {error && <p className="mt-2 text-sm text-red-600 dark:text-red-400">{error}</p>}

      <label className="mt-3 flex items-center gap-2 text-sm text-slate-900 dark:text-slate-100">
        <input
          type="checkbox"
          checked={claim.supporting_statement_provided}
          onChange={toggle}
          disabled={saving}
          className="h-4 w-4 rounded border-slate-300 text-brand-orange focus:ring-brand-orange"
        />
        Supporting statement provided to principal with this claim
      </label>
    </Card>
  );
}
