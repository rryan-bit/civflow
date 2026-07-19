"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { InspectionType } from "@/types/database";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export function NewInspectionForm({ projectId }: { projectId: string }) {
  const router = useRouter();
  const supabase = createClient();

  const [workArea, setWorkArea] = useState("");
  const [inspectionType, setInspectionType] = useState<InspectionType>("hold_point");
  const [scheduledDate, setScheduledDate] = useState("");
  const [inspectorName, setInspectorName] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!workArea.trim()) return;
    setSaving(true);
    setError(null);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { data, error } = await supabase
      .from("inspections")
      .insert({
        project_id: projectId,
        work_area: workArea.trim(),
        inspection_type: inspectionType,
        scheduled_date: scheduledDate || null,
        inspector_name: inspectorName.trim() || null,
        notes: notes.trim() || null,
        created_by: user?.id ?? null,
        status: "pending",
      })
      .select("id")
      .single();

    setSaving(false);

    if (error || !data) {
      setError(error?.message ?? "Couldn't create the inspection.");
      return;
    }

    router.push(`/projects/${projectId}/inspections/${data.id}`);
    router.refresh();
  }

  return (
    <Card className="p-5">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Work area / trade</label>
          <input
            type="text"
            value={workArea}
            onChange={(e) => setWorkArea(e.target.value)}
            required
            placeholder="e.g. Slab reinforcement — Block A"
            className="field mt-1"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Type</label>
            <select value={inspectionType} onChange={(e) => setInspectionType(e.target.value as InspectionType)} className="field mt-1">
              <option value="hold_point">Hold point</option>
              <option value="witness_point">Witness point</option>
              <option value="final">Final inspection</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Scheduled date</label>
            <input type="date" value={scheduledDate} onChange={(e) => setScheduledDate(e.target.value)} className="field mt-1" />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Inspector (optional)</label>
          <input type="text" value={inspectorName} onChange={(e) => setInspectorName(e.target.value)} className="field mt-1" />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Notes (optional)</label>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} className="field mt-1" />
        </div>

        {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

        <Button type="submit" loading={saving}>
          {saving ? "Creating…" : "Create Inspection"}
        </Button>
      </form>
    </Card>
  );
}
