"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { wouldCreateCycle, type ScheduleEdge } from "@/lib/schedule-calcs";
import type { Milestone } from "@/types/database";
import { Card } from "@/components/ui/card";

// Lets a builder say "framing can't start until the slab's poured" — sets
// up the dependency graph the ScheduleGantt above reads to compute the
// critical path. Deliberately a separate panel from the plain milestone
// list rather than inline per-row: sequencing is an occasional setup task,
// not something edited as often as status/dates.

export function SequencingPanel({
  milestones,
  edges,
}: {
  milestones: Pick<Milestone, "id" | "name" | "duration_days">[];
  edges: ScheduleEdge[];
}) {
  const router = useRouter();
  const supabase = createClient();
  const [selectedId, setSelectedId] = useState(milestones[0]?.id ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [durationDraft, setDurationDraft] = useState<Record<string, string>>({});

  const currentPredecessors = new Set(edges.filter((e) => e.successorId === selectedId).map((e) => e.predecessorId));

  async function togglePredecessor(predecessorId: string, checked: boolean) {
    setSaving(true);
    setError(null);

    if (checked) {
      if (wouldCreateCycle(edges, predecessorId, selectedId)) {
        setSaving(false);
        setError("That would create a circular dependency — pick a different milestone.");
        return;
      }
      const { error } = await supabase.from("milestone_dependencies").insert({ predecessor_id: predecessorId, successor_id: selectedId });
      if (error) {
        setSaving(false);
        setError(error.message);
        return;
      }
    } else {
      const { error } = await supabase
        .from("milestone_dependencies")
        .delete()
        .eq("predecessor_id", predecessorId)
        .eq("successor_id", selectedId);
      if (error) {
        setSaving(false);
        setError(error.message);
        return;
      }
    }

    setSaving(false);
    router.refresh();
  }

  async function saveDuration(id: string) {
    const value = durationDraft[id];
    if (!value) return;
    const days = Math.max(1, Number(value));
    setSaving(true);
    setError(null);
    const { error } = await supabase.from("milestones").update({ duration_days: days }).eq("id", id);
    setSaving(false);
    if (error) {
      setError(error.message);
      return;
    }
    router.refresh();
  }

  if (milestones.length < 2) {
    return (
      <Card className="p-5">
        <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Sequencing</h2>
        <p className="mt-1.5 text-sm text-slate-500 dark:text-slate-400">Add at least two milestones to set up dependencies between them.</p>
      </Card>
    );
  }

  return (
    <Card className="p-5">
      <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Sequencing</h2>
      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
        Give each milestone a duration and, if it can&apos;t start until another one finishes, mark that dependency —
        the schedule above updates to show what&apos;s actually driving the finish date.
      </p>

      <div className="mt-3 space-y-2">
        {milestones.map((m) => (
          <div key={m.id} className="flex items-center justify-between gap-2 text-sm">
            <span className="min-w-0 truncate text-slate-700 dark:text-slate-300">{m.name}</span>
            <div className="flex shrink-0 items-center gap-1.5">
              <input
                type="number"
                min={1}
                defaultValue={m.duration_days}
                onChange={(e) => setDurationDraft((d) => ({ ...d, [m.id]: e.target.value }))}
                onBlur={() => saveDuration(m.id)}
                className="field !w-16 !py-1 text-xs"
              />
              <span className="text-xs text-slate-400 dark:text-slate-500">days</span>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 border-t border-slate-100 pt-4 dark:border-slate-800">
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Depends on — for</label>
        <select value={selectedId} onChange={(e) => setSelectedId(e.target.value)} className="field mt-1">
          {milestones.map((m) => (
            <option key={m.id} value={m.id}>{m.name}</option>
          ))}
        </select>

        {error && <p className="mt-2 text-sm text-red-600 dark:text-red-400">{error}</p>}

        <div className="mt-2 space-y-1.5">
          {milestones
            .filter((m) => m.id !== selectedId)
            .map((m) => (
              <label key={m.id} className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
                <input
                  type="checkbox"
                  checked={currentPredecessors.has(m.id)}
                  disabled={saving}
                  onChange={(e) => togglePredecessor(m.id, e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-brand-orange focus:ring-brand-orange/40 dark:border-slate-700"
                />
                {m.name}
              </label>
            ))}
        </div>
      </div>
    </Card>
  );
}
