"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Subcontractor, SubcontractorStatus } from "@/types/database";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export function ContractPanel({ subcontractor }: { subcontractor: Subcontractor }) {
  const router = useRouter();
  const supabase = createClient();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [scope, setScope] = useState(subcontractor.scope_of_works ?? "");
  const [contractValue, setContractValue] = useState(subcontractor.contract_value?.toString() ?? "");
  const [retentionPct, setRetentionPct] = useState(subcontractor.retention_percentage?.toString() ?? "5");
  const [startDate, setStartDate] = useState(subcontractor.start_date ?? "");

  const isQuoting = subcontractor.status === "quoting";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const patch: {
      scope_of_works: string | null;
      contract_value: number | null;
      retention_percentage: number | null;
      start_date: string | null;
      status?: SubcontractorStatus;
    } = {
      scope_of_works: scope.trim() || null,
      contract_value: contractValue ? parseFloat(contractValue) : null,
      retention_percentage: retentionPct ? parseFloat(retentionPct) : null,
      start_date: startDate || null,
    };
    if (isQuoting) patch.status = "awarded";

    const { error } = await supabase.from("subcontractors").update(patch).eq("id", subcontractor.id);

    setSaving(false);
    if (error) {
      setError(error.message);
      return;
    }
    router.refresh();
  }

  async function startWork() {
    setSaving(true);
    setError(null);
    const { error } = await supabase.from("subcontractors").update({ status: "active" }).eq("id", subcontractor.id);
    setSaving(false);
    if (error) {
      setError(error.message);
      return;
    }
    router.refresh();
  }

  return (
    <Card className="p-5">
      {isQuoting && (
        <p className="mb-3 text-xs text-slate-500 dark:text-slate-400">
          Still at the quoting stage — accept a quote above, or fill these in directly to award the subcontract without one.
        </p>
      )}
      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Scope of works</label>
          <textarea value={scope} onChange={(e) => setScope(e.target.value)} rows={3} className="field mt-1" />
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Contract value (AUD)</label>
            <input type="number" step="0.01" value={contractValue} onChange={(e) => setContractValue(e.target.value)} className="field mt-1" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Retention %</label>
            <input type="number" step="0.5" value={retentionPct} onChange={(e) => setRetentionPct(e.target.value)} className="field mt-1" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Start date</label>
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="field mt-1" />
          </div>
        </div>

        {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

        <div className="flex items-center gap-3">
          <Button type="submit" loading={saving}>
            {isQuoting ? "Award subcontract" : "Save contract details"}
          </Button>
          {subcontractor.status === "awarded" && (
            <button type="button" onClick={startWork} disabled={saving} className="text-sm font-medium text-brand-orange hover:underline disabled:opacity-50">
              Mark work started
            </button>
          )}
        </div>
      </form>
    </Card>
  );
}
