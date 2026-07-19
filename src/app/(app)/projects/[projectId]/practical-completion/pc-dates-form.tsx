"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";

function toDateInput(d: Date) {
  return d.toISOString().slice(0, 10);
}

function addMonths(dateStr: string, months: number) {
  const d = new Date(dateStr);
  d.setMonth(d.getMonth() + months);
  return toDateInput(d);
}

export function PcDatesForm({
  projectId,
  practicalCompletionDate,
  defectsLiabilityEndDate,
}: {
  projectId: string;
  practicalCompletionDate: string | null;
  defectsLiabilityEndDate: string | null;
}) {
  const router = useRouter();
  const supabase = createClient();

  const [pcDate, setPcDate] = useState(practicalCompletionDate ?? "");
  const [dlpDate, setDlpDate] = useState(defectsLiabilityEndDate ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handlePcDateChange(value: string) {
    setPcDate(value);
    if (value && !dlpDate) {
      setDlpDate(addMonths(value, 12));
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const { error } = await supabase
      .from("projects")
      .update({
        practical_completion_date: pcDate || null,
        defects_liability_end_date: dlpDate || null,
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
    <form onSubmit={handleSubmit} className="mt-3 space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Practical completion date</label>
          <input type="date" value={pcDate} onChange={(e) => handlePcDateChange(e.target.value)} className="field mt-1" />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Defects liability end date</label>
          <input type="date" value={dlpDate} onChange={(e) => setDlpDate(e.target.value)} className="field mt-1" />
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Defaults to 12 months after PC — check your contract&apos;s actual DLP length.</p>
        </div>
      </div>

      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

      <Button type="submit" loading={saving}>
        {saving ? "Saving…" : "Save dates"}
      </Button>
    </form>
  );
}
