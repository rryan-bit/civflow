"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type DefectType = "structural" | "non_structural";

type Defect = {
  id: string;
  description: string;
  location: string | null;
  status: "open" | "rectified";
  defect_type: DefectType;
  noted_date: string;
  due_date: string | null;
  rectified_date: string | null;
  subcontractor_id: string | null;
};

type SubcontractorOption = { id: string; company_name: string };

function toDateInput(d: Date) {
  return d.toISOString().slice(0, 10);
}

// QBCC's Standards & Tolerances Guide gives structural defects a much
// longer window to be raised (6 years 6 months from completion) than
// non-structural ones (12 months) — very different urgency for what would
// otherwise look like the same "open defect" row.
const claimWindowHint: Record<DefectType, string> = {
  structural: "structural — claimable up to 6 years 6 months from completion",
  non_structural: "non-structural — generally claimable within 12 months of completion",
};

export function DefectsPanel({
  projectId,
  defects,
  subcontractors,
}: {
  projectId: string;
  defects: Defect[];
  subcontractors: SubcontractorOption[];
}) {
  const router = useRouter();
  const supabase = createClient();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [subcontractorId, setSubcontractorId] = useState("");
  const [defectType, setDefectType] = useState<DefectType>("non_structural");

  const subNameById = new Map(subcontractors.map((s) => [s.id, s.company_name]));

  async function addDefect(e: React.FormEvent) {
    e.preventDefault();
    if (!description.trim()) return;
    setSaving(true);
    setError(null);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { error } = await supabase.from("defects").insert({
      project_id: projectId,
      description: description.trim(),
      location: location.trim() || null,
      created_by: user?.id ?? null,
      status: "open",
      defect_type: defectType,
      subcontractor_id: subcontractorId || null,
    });

    setSaving(false);

    if (error) {
      setError(error.message);
      return;
    }

    setDescription("");
    setLocation("");
    setSubcontractorId("");
    setDefectType("non_structural");
    setAdding(false);
    router.refresh();
  }

  async function markRectified(id: string) {
    setSaving(true);
    setError(null);
    const { error } = await supabase
      .from("defects")
      .update({ status: "rectified", rectified_date: toDateInput(new Date()) })
      .eq("id", id);
    setSaving(false);
    if (error) {
      setError(error.message);
      return;
    }
    router.refresh();
  }

  return (
    <div className="mt-2">
      <Card className="divide-y divide-slate-100 overflow-hidden p-0 dark:divide-slate-800/80">
        {defects.map((d) => (
          <div key={d.id} className="flex items-center justify-between gap-3 px-4 py-3">
            <div className="min-w-0">
              <p className="truncate text-sm text-slate-900 dark:text-slate-100">{d.description}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {d.location ? `${d.location} · ` : ""}Noted {d.noted_date}
                {d.subcontractor_id && subNameById.get(d.subcontractor_id) && ` · ${subNameById.get(d.subcontractor_id)}`}
                {d.rectified_date && ` · rectified ${d.rectified_date}`}
              </p>
              <p className="mt-0.5 text-xs text-slate-400 dark:text-slate-500">{claimWindowHint[d.defect_type]}</p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <Badge tone={d.defect_type === "structural" ? "orange" : "neutral"}>
                {d.defect_type === "structural" ? "structural" : "non-structural"}
              </Badge>
              <Badge tone={d.status === "rectified" ? "emerald" : "red"}>{d.status}</Badge>
              {d.status === "open" && (
                <button
                  type="button"
                  onClick={() => markRectified(d.id)}
                  disabled={saving}
                  className="text-xs font-medium text-brand-orange hover:underline disabled:opacity-50"
                >
                  Rectify
                </button>
              )}
            </div>
          </div>
        ))}
        {!defects.length && (
          <p className="px-4 py-6 text-center text-sm text-slate-500 dark:text-slate-400">No defects recorded yet.</p>
        )}
      </Card>

      {error && <p className="mt-2 text-sm text-red-600 dark:text-red-400">{error}</p>}

      {adding ? (
        <form onSubmit={addDefect} className="mt-3 space-y-3 rounded-xl border border-slate-200 p-4 dark:border-slate-800">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Description</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} required rows={2} className="field mt-1" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Location (optional)</label>
            <input type="text" value={location} onChange={(e) => setLocation(e.target.value)} className="field mt-1" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Type</label>
            <select value={defectType} onChange={(e) => setDefectType(e.target.value as DefectType)} className="field mt-1">
              <option value="non_structural">Non-structural (finish/workmanship)</option>
              <option value="structural">Structural</option>
            </select>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{claimWindowHint[defectType]}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Subcontractor (optional)</label>
            <select value={subcontractorId} onChange={(e) => setSubcontractorId(e.target.value)} className="field mt-1">
              <option value="">Not attributed</option>
              {subcontractors.map((s) => (
                <option key={s.id} value={s.id}>{s.company_name}</option>
              ))}
            </select>
          </div>
          <div className="flex gap-2">
            <Button type="submit" loading={saving}>Add defect</Button>
            <button type="button" onClick={() => setAdding(false)} className="text-sm text-slate-500 hover:underline dark:text-slate-400">Cancel</button>
          </div>
        </form>
      ) : (
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="mt-3 text-sm font-medium text-brand-orange hover:underline"
        >
          + Add defect
        </button>
      )}
    </div>
  );
}
