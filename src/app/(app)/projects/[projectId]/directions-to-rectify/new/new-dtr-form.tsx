"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

function toDateInput(d: Date) {
  return d.toISOString().slice(0, 10);
}

const today = toDateInput(new Date());
const defaultDue = toDateInput(new Date(Date.now() + 35 * 24 * 60 * 60 * 1000));

export function NewDtrForm({ projectId }: { projectId: string }) {
  const router = useRouter();
  const supabase = createClient();

  const [description, setDescription] = useState("");
  const [issuedDate, setIssuedDate] = useState(today);
  const [dueDate, setDueDate] = useState(defaultDue);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!description.trim()) return;
    setSaving(true);
    setError(null);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { data, error } = await supabase
      .from("directions_to_rectify")
      .insert({
        project_id: projectId,
        description: description.trim(),
        issued_date: issuedDate,
        due_date: dueDate,
        notes: notes.trim() || null,
        created_by: user?.id ?? null,
        status: "open",
      })
      .select("id")
      .single();

    setSaving(false);

    if (error || !data) {
      setError(error?.message ?? "Couldn't create the direction to rectify.");
      return;
    }

    router.push(`/projects/${projectId}/directions-to-rectify/${data.id}`);
    router.refresh();
  }

  return (
    <Card className="p-5">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
            rows={4}
            placeholder="What defective or incomplete work was the direction issued for?"
            className="field mt-1"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Issued date</label>
            <input type="date" value={issuedDate} onChange={(e) => setIssuedDate(e.target.value)} className="field mt-1" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Due date</label>
            <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} required className="field mt-1" />
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Defaults to 35 days out — the usual QBCC rectification period. Adjust if yours differs.</p>
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Notes (optional)</label>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} placeholder="Reference number, inspector, etc." className="field mt-1" />
        </div>

        {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

        <Button type="submit" loading={saving}>
          {saving ? "Creating…" : "Create Direction to Rectify"}
        </Button>
      </form>
    </Card>
  );
}
