"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { EotCause } from "@/types/database";
import { addBusinessDays, toDateInput } from "@/lib/dates";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const causeOptions: { value: EotCause; label: string }[] = [
  { value: "weather", label: "Weather" },
  { value: "latent_conditions", label: "Latent conditions" },
  { value: "client_variation", label: "Client-caused delay" },
  { value: "subcontractor_delay", label: "Subcontractor delay" },
  { value: "authority_delay", label: "Authority/approval delay" },
  { value: "other", label: "Other" },
];

export function NewEotClaimForm({ projectId, milestones }: { projectId: string; milestones: { id: string; name: string }[] }) {
  const router = useRouter();
  const supabase = createClient();

  const [title, setTitle] = useState("");
  const [cause, setCause] = useState<EotCause>("weather");
  const [description, setDescription] = useState("");
  const [milestoneId, setMilestoneId] = useState("");
  const [dateBecameAware, setDateBecameAware] = useState(toDateInput(new Date()));
  const [daysClaimed, setDaysClaimed] = useState("");
  const [noticeDueDate, setNoticeDueDate] = useState(addBusinessDays(10, new Date()));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleAwareDateChange(value: string) {
    setDateBecameAware(value);
    if (value) setNoticeDueDate(addBusinessDays(10, new Date(value)));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    setSaving(true);
    setError(null);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { data, error } = await supabase
      .from("eot_claims")
      .insert({
        project_id: projectId,
        milestone_id: milestoneId || null,
        title: title.trim(),
        cause,
        description: description.trim() || null,
        date_became_aware: dateBecameAware,
        days_claimed: daysClaimed ? Number(daysClaimed) : null,
        notice_due_date: noticeDueDate,
        status: "open",
        created_by: user?.id ?? null,
      })
      .select("id")
      .single();

    setSaving(false);

    if (error || !data) {
      setError(error?.message ?? "Couldn't create the EOT claim.");
      return;
    }

    router.push(`/projects/${projectId}/eot-claims/${data.id}`);
    router.refresh();
  }

  return (
    <Card className="p-5">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Title</label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            placeholder="e.g. Wet weather — foundation stage"
            className="field mt-1"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Cause</label>
          <select value={cause} onChange={(e) => setCause(e.target.value as EotCause)} className="field mt-1">
            {causeOptions.map((c) => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>
        </div>

        {milestones.length > 0 && (
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Related milestone (optional)</label>
            <select value={milestoneId} onChange={(e) => setMilestoneId(e.target.value)} className="field mt-1">
              <option value="">None</option>
              {milestones.map((m) => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
            placeholder="What happened, and what it affected — reference diary entries or weather logs if relevant"
            className="field mt-1"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Date you became aware</label>
            <input type="date" value={dateBecameAware} onChange={(e) => handleAwareDateChange(e.target.value)} className="field mt-1" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Days claimed</label>
            <input type="number" value={daysClaimed} onChange={(e) => setDaysClaimed(e.target.value)} placeholder="0" className="field mt-1" />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Notice deadline</label>
          <input type="date" value={noticeDueDate} onChange={(e) => setNoticeDueDate(e.target.value)} className="field mt-1" />
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Defaults to 10 business days from when you became aware — the common HIA/QBCC window. Check your actual
            contract clause and adjust if it specifies something different.
          </p>
        </div>

        {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

        <Button type="submit" loading={saving}>
          {saving ? "Creating…" : "Create claim"}
        </Button>
      </form>
    </Card>
  );
}
