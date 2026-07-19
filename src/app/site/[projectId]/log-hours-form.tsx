"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";

function toDateInput(d: Date) {
  return d.toISOString().slice(0, 10);
}

export function LogHoursForm({ projectId }: { projectId: string }) {
  const router = useRouter();
  const supabase = createClient();

  const [workDate, setWorkDate] = useState(toDateInput(new Date()));
  const [hours, setHours] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!hours) return;
    setSaving(true);
    setError(null);

    const { error: rpcError } = await supabase.rpc("log_my_hours", {
      target_project_id: projectId,
      p_work_date: workDate,
      p_hours: parseFloat(hours),
      p_notes: notes.trim() || null,
    });

    setSaving(false);
    if (rpcError) {
      setError(rpcError.message);
      return;
    }

    setHours("");
    setNotes("");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="mt-3 space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Date</label>
          <input type="date" value={workDate} onChange={(e) => setWorkDate(e.target.value)} className="field mt-1" />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Hours</label>
          <input type="number" step="0.25" min="0" max="24" value={hours} onChange={(e) => setHours(e.target.value)} required className="field mt-1" />
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Notes (optional)</label>
        <input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="e.g. Framing, level 1" className="field mt-1" />
      </div>
      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
      <Button type="submit" size="sm" loading={saving}>Log hours</Button>
    </form>
  );
}
