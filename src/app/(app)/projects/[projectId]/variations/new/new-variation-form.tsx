"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { VariationRequestedByType } from "@/types/database";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export function NewVariationForm({ projectId }: { projectId: string }) {
  const router = useRouter();
  const supabase = createClient();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [costImpact, setCostImpact] = useState("");
  const [timeImpact, setTimeImpact] = useState("");
  const [requestedByType, setRequestedByType] = useState<VariationRequestedByType>("client");
  const [reason, setReason] = useState("");
  const [clientName, setClientName] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reasonRequired = requestedByType === "builder";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    if (reasonRequired && !reason.trim()) {
      setError("Since this is builder-initiated, a reason is required — this is what the Act requires the written variation to state.");
      return;
    }
    setSaving(true);
    setError(null);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { data, error } = await supabase
      .from("variations")
      .insert({
        project_id: projectId,
        title: title.trim(),
        description: description.trim() || null,
        cost_impact: costImpact ? Number(costImpact) : null,
        time_impact_days: timeImpact ? Number(timeImpact) : null,
        raised_by: user?.id ?? null,
        status: "draft",
        requested_by_type: requestedByType,
        reason: reason.trim() || null,
        client_name: clientName.trim() || null,
      })
      .select("id")
      .single();

    setSaving(false);

    if (error || !data) {
      setError(error?.message ?? "Couldn't create the variation.");
      return;
    }

    router.push(`/projects/${projectId}/variations/${data.id}`);
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
            placeholder="e.g. Additional excavation — unforeseen rock"
            className="field mt-1"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
            placeholder="Detail on what changed and why"
            className="field mt-1"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Who asked for this?</label>
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
            The written variation needs to state this — and a reason, if it was your call rather than the client&apos;s.
          </p>
          <div className="mt-1.5 flex gap-2">
            <button
              type="button"
              onClick={() => setRequestedByType("client")}
              className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                requestedByType === "client"
                  ? "border-brand-orange bg-orange-50 text-brand-orange dark:bg-orange-950/30"
                  : "border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-800 dark:text-slate-400 dark:hover:bg-slate-800/60"
              }`}
            >
              The client requested it
            </button>
            <button
              type="button"
              onClick={() => setRequestedByType("builder")}
              className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                requestedByType === "builder"
                  ? "border-brand-orange bg-orange-50 text-brand-orange dark:bg-orange-950/30"
                  : "border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-800 dark:text-slate-400 dark:hover:bg-slate-800/60"
              }`}
            >
              We initiated it
            </button>
          </div>
        </div>

        {reasonRequired && (
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Reason (required)</label>
            <input
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Site conditions required a design change to meet the engineer's specification"
              className="field mt-1"
            />
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Client name (optional, for the approval link)</label>
          <input
            value={clientName}
            onChange={(e) => setClientName(e.target.value)}
            placeholder="Who you'll send the approval link to"
            className="field mt-1"
          />
        </div>

        <div className="flex gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Cost impact ($)</label>
            <input type="number" value={costImpact} onChange={(e) => setCostImpact(e.target.value)} placeholder="0" className="field mt-1 w-32" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Time impact (days)</label>
            <input type="number" value={timeImpact} onChange={(e) => setTimeImpact(e.target.value)} placeholder="0" className="field mt-1 w-32" />
          </div>
        </div>

        {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

        <Button type="submit" loading={saving}>
          {saving ? "Creating…" : "Create variation"}
        </Button>
      </form>
    </Card>
  );
}
