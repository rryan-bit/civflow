"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";

function toDateInput(d: Date) {
  return d.toISOString().slice(0, 10);
}

export function AddReminderForm({
  projects,
  compact = false,
}: {
  projects?: { id: string; name: string }[];
  compact?: boolean;
}) {
  const router = useRouter();
  const supabase = createClient();
  const [open, setOpen] = useState(!compact);
  const [title, setTitle] = useState("");
  const [dueDate, setDueDate] = useState(toDateInput(new Date()));
  const [projectId, setProjectId] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    setSaving(true);
    setError(null);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { data: profile } = await supabase.from("profiles").select("company_id").eq("id", user!.id).single();

    if (!profile?.company_id) {
      setError("Your account has no company assigned yet.");
      setSaving(false);
      return;
    }

    const { error } = await supabase.from("reminders").insert({
      company_id: profile.company_id,
      project_id: projectId || null,
      title: title.trim(),
      due_date: dueDate,
      notes: notes.trim() || null,
      created_by: user?.id ?? null,
    });

    setSaving(false);

    if (error) {
      setError(error.message);
      return;
    }

    setTitle("");
    setDueDate(toDateInput(new Date()));
    setProjectId("");
    setNotes("");
    if (compact) setOpen(false);
    router.refresh();
  }

  if (compact && !open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="text-sm font-medium text-brand-orange hover:underline">
        + Add reminder
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 rounded-xl border border-slate-200 p-4 dark:border-slate-800">
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">What&apos;s the reminder?</label>
          <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} required className="field mt-1" />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Due date</label>
          <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} required className="field mt-1" />
        </div>
        {projects && projects.length > 0 && (
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Project (optional)</label>
            <select value={projectId} onChange={(e) => setProjectId(e.target.value)} className="field mt-1">
              <option value="">None</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
        )}
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Notes (optional)</label>
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className="field mt-1" />
      </div>

      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

      <div className="flex gap-2">
        <Button type="submit" loading={saving} size="sm">Add reminder</Button>
        {compact && (
          <button type="button" onClick={() => setOpen(false)} className="text-sm text-slate-500 hover:underline dark:text-slate-400">
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}
