"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Milestone, MilestoneStatus } from "@/types/database";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EmptyState, EmptyIcons } from "@/components/ui/empty-state";

const statusColor: Record<MilestoneStatus, string> = {
  pending: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400",
  on_track: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400",
  at_risk: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
  delayed: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400",
  complete: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400",
};

const statusLabel: Record<MilestoneStatus, string> = {
  pending: "Pending",
  on_track: "On track",
  at_risk: "At risk",
  delayed: "Delayed",
  complete: "Complete",
};

function formatDate(d: string | null) {
  if (!d) return null;
  return new Date(d).toLocaleDateString("en-AU",{ year: "numeric", month: "short", day: "numeric" });
}

function toDateInput(d: Date) {
  return d.toISOString().slice(0, 10);
}

export function MilestonesList({
  projectId,
  milestones,
}: {
  projectId: string;
  milestones: Pick<Milestone, "id" | "name" | "target_date" | "status" | "notes" | "actual_date" | "delay_reason" | "duration_days" | "created_at">[];
}) {
  const router = useRouter();
  const supabase = createClient();

  const [name, setName] = useState("");
  const [targetDate, setTargetDate] = useState("");
  const [durationDays, setDurationDays] = useState("1");
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [reasonEditingId, setReasonEditingId] = useState<string | null>(null);
  const [reasonInput, setReasonInput] = useState("");

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setAdding(true);
    setError(null);

    const { error } = await supabase.from("milestones").insert({
      project_id: projectId,
      name: name.trim(),
      target_date: targetDate || null,
      duration_days: Math.max(1, Number(durationDays) || 1),
    });

    setAdding(false);
    if (error) {
      setError(error.message);
      return;
    }
    setName("");
    setTargetDate("");
    setDurationDays("1");
    router.refresh();
  }

  async function handleStatusChange(id: string, status: MilestoneStatus) {
    const patch: { status: MilestoneStatus; actual_date?: string } = { status };
    if (status === "complete") patch.actual_date = toDateInput(new Date());
    await supabase.from("milestones").update(patch).eq("id", id);
    if (status === "delayed") {
      setReasonEditingId(id);
      setReasonInput("");
    }
    router.refresh();
  }

  async function saveDelayReason(id: string) {
    await supabase.from("milestones").update({ delay_reason: reasonInput.trim() || null }).eq("id", id);
    setReasonEditingId(null);
    setReasonInput("");
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <Card className="p-5">
        <form onSubmit={handleAdd} className="flex flex-wrap items-end gap-3">
          <div className="min-w-[12rem] flex-1">
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Milestone</label>
            <input value={name} onChange={(e) => setName(e.target.value)} required placeholder="e.g. Slab pour complete" className="field mt-1" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Target date</label>
            <input type="date" value={targetDate} onChange={(e) => setTargetDate(e.target.value)} className="field mt-1 w-auto" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Duration (days)</label>
            <input type="number" min={1} value={durationDays} onChange={(e) => setDurationDays(e.target.value)} className="field mt-1 w-20" />
          </div>
          <Button type="submit" loading={adding}>
            {adding ? "Adding…" : "Add"}
          </Button>
        </form>
        {error && <p className="mt-2 text-sm text-red-600 dark:text-red-400">{error}</p>}
      </Card>

      <Card className="divide-y divide-slate-100 overflow-hidden p-0 dark:divide-slate-800/80">
        {milestones.map((m) => (
          <div key={m.id} className="px-4 py-3.5">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm text-slate-900 dark:text-slate-100">{m.name}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {m.target_date && `Target ${formatDate(m.target_date)}`}
                  {m.status === "complete" && m.actual_date && ` · Completed ${formatDate(m.actual_date)}`}
                </p>
              </div>
              <select
                value={m.status}
                onChange={(e) => handleStatusChange(m.id, e.target.value as MilestoneStatus)}
                className={`shrink-0 rounded-full border-0 px-2.5 py-1 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-brand-orange/40 ${statusColor[m.status]}`}
              >
                {(Object.keys(statusLabel) as MilestoneStatus[]).map((s) => (
                  <option key={s} value={s}>
                    {statusLabel[s]}
                  </option>
                ))}
              </select>
            </div>

            {m.status === "delayed" && reasonEditingId !== m.id && (
              <div className="mt-1.5 flex items-center gap-2">
                {m.delay_reason ? (
                  <p className="text-xs text-red-600 dark:text-red-400">Delay: {m.delay_reason}</p>
                ) : (
                  <button
                    type="button"
                    onClick={() => { setReasonEditingId(m.id); setReasonInput(""); }}
                    className="text-xs font-medium text-brand-orange hover:underline"
                  >
                    + Add delay reason
                  </button>
                )}
                {m.delay_reason && (
                  <button
                    type="button"
                    onClick={() => { setReasonEditingId(m.id); setReasonInput(m.delay_reason ?? ""); }}
                    className="text-xs text-slate-400 hover:underline"
                  >
                    Edit
                  </button>
                )}
              </div>
            )}
            {reasonEditingId === m.id && (
              <div className="mt-1.5 flex items-center gap-2">
                <input
                  type="text"
                  value={reasonInput}
                  onChange={(e) => setReasonInput(e.target.value)}
                  placeholder="e.g. Wet weather, awaiting client instruction"
                  className="field !w-auto flex-1 !py-1.5 text-xs"
                />
                <button type="button" onClick={() => saveDelayReason(m.id)} className="text-xs font-medium text-brand-orange hover:underline">Save</button>
                <button type="button" onClick={() => setReasonEditingId(null)} className="text-xs text-slate-500 hover:underline dark:text-slate-400">Cancel</button>
              </div>
            )}
          </div>
        ))}
        {!milestones.length && (
          <EmptyState icon={EmptyIcons.flag} title="No milestones yet on this project." className="px-4 py-8" />
        )}
      </Card>
    </div>
  );
}
