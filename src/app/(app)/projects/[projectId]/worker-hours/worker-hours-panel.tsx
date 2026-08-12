"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Worker, WorkerTimeEntry } from "@/types/database";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EmptyState, EmptyIcons } from "@/components/ui/empty-state";

function toDateInput(d: Date) {
  return d.toISOString().slice(0, 10);
}

export function WorkerHoursPanel({
  projectId,
  companyId,
  workers,
  entries,
}: {
  projectId: string;
  companyId: string;
  workers: Worker[];
  entries: WorkerTimeEntry[];
}) {
  const router = useRouter();
  const supabase = createClient();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [addingWorker, setAddingWorker] = useState(false);
  const [newWorkerName, setNewWorkerName] = useState("");
  const [newWorkerTrade, setNewWorkerTrade] = useState("");

  const [workerId, setWorkerId] = useState(workers[0]?.id ?? "");
  const [workDate, setWorkDate] = useState(toDateInput(new Date()));
  const [hours, setHours] = useState("");
  const [notes, setNotes] = useState("");

  const workerNameById = useMemo(() => new Map(workers.map((w) => [w.id, w.name])), [workers]);

  const totalsByWorker = useMemo(() => {
    const totals = new Map<string, number>();
    for (const e of entries) {
      totals.set(e.worker_id, (totals.get(e.worker_id) ?? 0) + e.hours);
    }
    return [...totals.entries()]
      .map(([id, total]) => ({ id, name: workerNameById.get(id) ?? "Unknown worker", total }))
      .sort((a, b) => b.total - a.total);
  }, [entries, workerNameById]);

  async function addWorker(e: React.FormEvent) {
    e.preventDefault();
    if (!newWorkerName.trim()) return;
    setSaving(true);
    setError(null);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { data, error } = await supabase
      .from("workers")
      .insert({
        company_id: companyId,
        name: newWorkerName.trim(),
        trade: newWorkerTrade.trim() || null,
        created_by: user?.id ?? null,
      })
      .select("id")
      .single();

    setSaving(false);
    if (error) {
      setError(error.message);
      return;
    }
    setNewWorkerName("");
    setNewWorkerTrade("");
    setAddingWorker(false);
    if (data) setWorkerId(data.id);
    router.refresh();
  }

  async function logHours(e: React.FormEvent) {
    e.preventDefault();
    if (!workerId || !hours) return;
    setSaving(true);
    setError(null);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { error } = await supabase.from("worker_time_entries").insert({
      worker_id: workerId,
      project_id: projectId,
      work_date: workDate,
      hours: parseFloat(hours),
      notes: notes.trim() || null,
      created_by: user?.id ?? null,
    });

    setSaving(false);
    if (error) {
      setError(error.message);
      return;
    }
    setHours("");
    setNotes("");
    router.refresh();
  }

  async function deleteEntry(id: string) {
    setSaving(true);
    setError(null);
    const { error } = await supabase.from("worker_time_entries").delete().eq("id", id);
    setSaving(false);
    if (error) {
      setError(error.message);
      return;
    }
    router.refresh();
  }

  return (
    <div className="space-y-6">
      {totalsByWorker.length > 0 && (
        <Card className="p-5">
          <h3 className="text-sm font-medium text-slate-700 dark:text-slate-300">Hours by worker</h3>
          <div className="mt-3 space-y-1.5">
            {totalsByWorker.map((t) => (
              <div key={t.id} className="flex items-center justify-between text-sm">
                <span className="text-slate-700 dark:text-slate-300">{t.name}</span>
                <span className="font-medium tabular-nums text-slate-900 dark:text-slate-100">{t.total}h</span>
              </div>
            ))}
          </div>
        </Card>
      )}

      <Card className="p-5">
        <h3 className="text-sm font-medium text-slate-700 dark:text-slate-300">Log hours</h3>
        {error && <p className="mt-2 text-sm text-red-600 dark:text-red-400">{error}</p>}
        <form onSubmit={logHours} className="mt-3 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Worker</label>
              {workers.length > 0 ? (
                <select value={workerId} onChange={(e) => setWorkerId(e.target.value)} className="field mt-1">
                  {workers.map((w) => (
                    <option key={w.id} value={w.id}>{w.name}{w.trade ? ` — ${w.trade}` : ""}</option>
                  ))}
                </select>
              ) : (
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Add a worker first, below.</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Date</label>
              <input type="date" value={workDate} onChange={(e) => setWorkDate(e.target.value)} className="field mt-1" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Hours</label>
              <input type="number" step="0.25" value={hours} onChange={(e) => setHours(e.target.value)} required className="field mt-1" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Notes (optional)</label>
              <input value={notes} onChange={(e) => setNotes(e.target.value)} className="field mt-1" />
            </div>
          </div>
          <Button type="submit" loading={saving} disabled={!workers.length}>Log hours</Button>
        </form>

        {addingWorker ? (
          <form onSubmit={addWorker} className="mt-4 space-y-2 rounded-lg border border-slate-200 p-3 dark:border-slate-800">
            <div className="grid grid-cols-2 gap-2">
              <input value={newWorkerName} onChange={(e) => setNewWorkerName(e.target.value)} required placeholder="Worker name" className="field !py-1.5 text-xs" />
              <input value={newWorkerTrade} onChange={(e) => setNewWorkerTrade(e.target.value)} placeholder="Trade (optional)" className="field !py-1.5 text-xs" />
            </div>
            <div className="flex gap-2">
              <Button type="submit" size="sm" loading={saving}>Add worker</Button>
              <button type="button" onClick={() => setAddingWorker(false)} className="text-xs text-slate-500 hover:underline dark:text-slate-400">Cancel</button>
            </div>
          </form>
        ) : (
          <button type="button" onClick={() => setAddingWorker(true)} className="mt-3 text-xs font-medium text-brand-orange hover:underline">
            + Add a new worker
          </button>
        )}
      </Card>

      <div>
        <h3 className="text-sm font-medium text-slate-700 dark:text-slate-300">Entries</h3>
        <Card className="mt-2 divide-y divide-slate-100 overflow-hidden p-0 dark:divide-slate-800/80">
          {entries.map((e) => (
            <div key={e.id} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
              <div className="min-w-0">
                <p className="text-slate-900 dark:text-slate-100">{workerNameById.get(e.worker_id) ?? "Unknown worker"} — {e.hours}h</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">{e.work_date}{e.notes ? ` · ${e.notes}` : ""}</p>
              </div>
              <button type="button" onClick={() => deleteEntry(e.id)} disabled={saving} className="shrink-0 text-xs text-slate-400 hover:text-red-600 disabled:opacity-50 dark:hover:text-red-400">
                Remove
              </button>
            </div>
          ))}
          {!entries.length && <EmptyState icon={EmptyIcons.clock} title="No hours logged yet." className="px-4 py-8" />}
        </Card>
      </div>
    </div>
  );
}
