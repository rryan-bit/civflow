"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

type HandoverItem = {
  id: string;
  label: string;
  category: string;
  completed: boolean;
  completed_date: string | null;
};

const STANDARD_CHECKLIST: { label: string; category: string }[] = [
  { label: "Form 21 final inspection certificate obtained", category: "compliance" },
  { label: "Certificate of occupancy / final approval obtained", category: "compliance" },
  { label: "Defects list signed off by both parties", category: "defects" },
  { label: "Manufacturer warranties & care guides handed over", category: "physical" },
  { label: "Operation & maintenance manuals provided", category: "physical" },
  { label: "As-built drawings provided", category: "physical" },
  { label: "Keys, codes & access devices handed over", category: "physical" },
  { label: "Final payment claim / reconciliation complete", category: "commercial" },
  { label: "Practical completion certificate signed by both parties", category: "commercial" },
];

function toDateInput(d: Date) {
  return d.toISOString().slice(0, 10);
}

export function HandoverChecklist({ projectId, items }: { projectId: string; items: HandoverItem[] }) {
  const router = useRouter();
  const supabase = createClient();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function setupChecklist() {
    setSaving(true);
    setError(null);
    const { error } = await supabase.from("handover_items").insert(
      STANDARD_CHECKLIST.map((item, i) => ({
        project_id: projectId,
        label: item.label,
        category: item.category,
        sort_order: i,
      }))
    );
    setSaving(false);
    if (error) {
      setError(error.message);
      return;
    }
    router.refresh();
  }

  async function toggle(item: HandoverItem) {
    setSaving(true);
    setError(null);
    const { error } = await supabase
      .from("handover_items")
      .update({ completed: !item.completed, completed_date: !item.completed ? toDateInput(new Date()) : null })
      .eq("id", item.id);
    setSaving(false);
    if (error) {
      setError(error.message);
      return;
    }
    router.refresh();
  }

  const completedCount = items.filter((i) => i.completed).length;

  return (
    <div className="mt-2">
      {error && <p className="mb-2 text-sm text-red-600 dark:text-red-400">{error}</p>}

      {!items.length ? (
        <Card className="p-5">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Set up the standard QLD handover checklist to track close-out items for this project.
          </p>
          <Button onClick={setupChecklist} loading={saving} className="mt-3">
            Set up handover checklist
          </Button>
        </Card>
      ) : (
        <>
          <p className="text-xs text-slate-500 dark:text-slate-400">{completedCount} of {items.length} complete</p>
          <Card className="mt-1.5 divide-y divide-slate-100 overflow-hidden p-0 dark:divide-slate-800/80">
            {items.map((item) => (
              <label key={item.id} className="flex cursor-pointer items-center gap-3 px-4 py-3 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/60">
                <input
                  type="checkbox"
                  checked={item.completed}
                  onChange={() => toggle(item)}
                  disabled={saving}
                  className="h-4 w-4 shrink-0 rounded border-slate-300 text-brand-orange focus:ring-brand-orange dark:border-slate-700"
                />
                <span className={`text-sm ${item.completed ? "text-slate-400 line-through dark:text-slate-500" : "text-slate-900 dark:text-slate-100"}`}>
                  {item.label}
                </span>
              </label>
            ))}
          </Card>
        </>
      )}
    </div>
  );
}
