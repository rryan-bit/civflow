"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export function NewNcrForm({ projectId, inspectionId }: { projectId: string; inspectionId: string }) {
  const router = useRouter();
  const supabase = createClient();

  const [description, setDescription] = useState("");
  const [trade, setTrade] = useState("");
  const [correctiveAction, setCorrectiveAction] = useState("");
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
      .from("non_conformance_reports")
      .insert({
        project_id: projectId,
        inspection_id: inspectionId || null,
        description: description.trim(),
        trade: trade.trim() || null,
        corrective_action: correctiveAction.trim() || null,
        created_by: user?.id ?? null,
        status: "open",
      })
      .select("id")
      .single();

    setSaving(false);

    if (error || !data) {
      setError(error?.message ?? "Couldn't create the NCR.");
      return;
    }

    router.push(`/projects/${projectId}/ncrs/${data.id}`);
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
            placeholder="What doesn't conform to spec/drawings/standards?"
            className="field mt-1"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Trade (optional)</label>
          <input type="text" value={trade} onChange={(e) => setTrade(e.target.value)} className="field mt-1" />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Corrective action (optional)</label>
          <textarea value={correctiveAction} onChange={(e) => setCorrectiveAction(e.target.value)} rows={3} className="field mt-1" />
        </div>

        {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

        <Button type="submit" loading={saving}>
          {saving ? "Creating…" : "Create NCR"}
        </Button>
      </form>
    </Card>
  );
}
