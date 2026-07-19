"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export function NewSelectionForm({ projectId }: { projectId: string }) {
  const router = useRouter();
  const supabase = createClient();

  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [allowanceAmount, setAllowanceAmount] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!category.trim()) return;
    setSaving(true);
    setError(null);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { data, error } = await supabase
      .from("selections")
      .insert({
        project_id: projectId,
        category: category.trim(),
        description: description.trim() || null,
        allowance_amount: allowanceAmount ? Number(allowanceAmount) : null,
        due_date: dueDate || null,
        status: "draft",
        created_by: user?.id ?? null,
      })
      .select("id")
      .single();

    setSaving(false);

    if (error || !data) {
      setError(error?.message ?? "Couldn't create the selection.");
      return;
    }

    router.push(`/projects/${projectId}/selections/${data.id}`);
    router.refresh();
  }

  return (
    <Card className="p-5">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Category</label>
          <input
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            required
            placeholder="e.g. Kitchen tapware"
            className="field mt-1"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Description (optional)</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            placeholder="Anything the client should know before choosing"
            className="field mt-1"
          />
        </div>
        <div className="flex gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Allowance ($)</label>
            <input type="number" value={allowanceAmount} onChange={(e) => setAllowanceAmount(e.target.value)} placeholder="0" className="field mt-1 w-32" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Decision due date</label>
            <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="field mt-1" />
          </div>
        </div>

        {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

        <Button type="submit" loading={saving}>
          {saving ? "Creating…" : "Create selection"}
        </Button>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          You&apos;ll add the actual options (products, prices, suppliers) on the next page before sending it to the client.
        </p>
      </form>
    </Card>
  );
}
