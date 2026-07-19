"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import type { Subcontractor, Defect } from "@/types/database";
import { Card } from "@/components/ui/card";
import { Badge, BadgeTone } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

function toDateInput(d: Date) {
  return d.toISOString().slice(0, 10);
}

function formatCurrency(n: number) {
  return n.toLocaleString(undefined, { style: "currency", currency: "AUD" });
}

export function CompletionPanel({
  subcontractor,
  totalRetentionHeld,
  defects,
}: {
  subcontractor: Subcontractor;
  totalRetentionHeld: number;
  defects: Defect[];
}) {
  const router = useRouter();
  const supabase = createClient();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [releasing, setReleasing] = useState(false);
  const [releaseAmount, setReleaseAmount] = useState("");

  const alreadyReleased = subcontractor.retention_released_amount ?? 0;
  const outstandingRetention = Math.max(0, totalRetentionHeld - alreadyReleased);
  const openDefects = defects.filter((d) => d.status === "open").length;

  async function markComplete() {
    setSaving(true);
    setError(null);
    const { error } = await supabase
      .from("subcontractors")
      .update({ status: "complete", completion_date: toDateInput(new Date()) })
      .eq("id", subcontractor.id);
    setSaving(false);
    if (error) {
      setError(error.message);
      return;
    }
    router.refresh();
  }

  async function terminate() {
    if (!confirm("Mark this subcontractor as terminated? This won't delete their records.")) return;
    setSaving(true);
    setError(null);
    const { error } = await supabase.from("subcontractors").update({ status: "terminated" }).eq("id", subcontractor.id);
    setSaving(false);
    if (error) {
      setError(error.message);
      return;
    }
    router.refresh();
  }

  async function recordRelease(e: React.FormEvent) {
    e.preventDefault();
    const amount = parseFloat(releaseAmount);
    if (Number.isNaN(amount) || amount <= 0) return;
    setSaving(true);
    setError(null);
    const { error } = await supabase
      .from("subcontractors")
      .update({ retention_released_amount: alreadyReleased + amount, retention_released_date: toDateInput(new Date()) })
      .eq("id", subcontractor.id);
    setSaving(false);
    if (error) {
      setError(error.message);
      return;
    }
    setReleaseAmount("");
    setReleasing(false);
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <Card className="p-5">
        {error && <p className="mb-2 text-sm text-red-600 dark:text-red-400">{error}</p>}

        <div className="flex flex-wrap items-center gap-2">
          {(subcontractor.status === "awarded" || subcontractor.status === "active") && (
            <Button onClick={markComplete} loading={saving} className="!bg-emerald-600 hover:!bg-emerald-700">
              Mark scope complete
            </Button>
          )}
          {subcontractor.status !== "complete" && subcontractor.status !== "terminated" && (
            <button type="button" onClick={terminate} disabled={saving} className="text-sm text-slate-400 hover:text-red-600 disabled:opacity-50 dark:hover:text-red-400">
              Terminate
            </button>
          )}
          {subcontractor.status === "complete" && subcontractor.completion_date && (
            <p className="flex items-center gap-1.5 text-sm font-medium text-emerald-700 dark:text-emerald-400">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
              Scope complete as of {subcontractor.completion_date}
            </p>
          )}
        </div>

        {totalRetentionHeld > 0 && (
          <div className="mt-4 border-t border-slate-100 pt-4 dark:border-slate-800">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-sm font-medium text-slate-700 dark:text-slate-300">Retention</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {formatCurrency(totalRetentionHeld)} withheld total
                  {alreadyReleased > 0 && ` · ${formatCurrency(alreadyReleased)} released`}
                  {outstandingRetention > 0 && ` · ${formatCurrency(outstandingRetention)} outstanding`}
                </p>
              </div>
              {outstandingRetention > 0 && !releasing && (
                <button type="button" onClick={() => { setReleasing(true); setReleaseAmount(outstandingRetention.toString()); }} className="text-xs font-medium text-brand-orange hover:underline">
                  Record retention release
                </button>
              )}
            </div>
            {releasing && (
              <form onSubmit={recordRelease} className="mt-2 flex items-center gap-2">
                <input type="number" step="0.01" value={releaseAmount} onChange={(e) => setReleaseAmount(e.target.value)} className="field !w-auto flex-1 !py-1.5 text-xs" />
                <Button type="submit" size="sm" loading={saving}>Save</Button>
                <button type="button" onClick={() => setReleasing(false)} className="text-xs text-slate-500 hover:underline dark:text-slate-400">Cancel</button>
              </form>
            )}
            <p className="mt-1.5 text-xs text-slate-400 dark:text-slate-500">
              Typically released in two parts — at practical completion, and again after the defects liability period once defects are rectified.
            </p>
          </div>
        )}
      </Card>

      <div>
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">
            Defects {openDefects > 0 && <span className="font-normal text-slate-400">({openDefects} open)</span>}
          </h3>
          <Link href={`/projects/${subcontractor.project_id}/practical-completion`} className="text-xs font-medium text-brand-orange hover:underline">
            Add / view all defects
          </Link>
        </div>
        <Card className="mt-2 divide-y divide-slate-100 overflow-hidden p-0 dark:divide-slate-800/80">
          {defects.map((d) => (
            <div key={d.id} className="flex items-center justify-between gap-3 px-4 py-3">
              <span className="min-w-0 truncate text-sm text-slate-900 dark:text-slate-100">{d.description}</span>
              <Badge tone={(d.status === "open" ? "red" : "emerald") as BadgeTone} className="shrink-0">{d.status}</Badge>
            </div>
          ))}
          {!defects.length && <p className="px-4 py-6 text-center text-sm text-slate-500 dark:text-slate-400">No defects attributed to this subcontractor.</p>}
        </Card>
      </div>
    </div>
  );
}
