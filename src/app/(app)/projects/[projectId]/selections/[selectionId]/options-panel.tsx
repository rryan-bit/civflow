"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { SelectionOption } from "@/types/database";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

function formatCurrency(n: number | null) {
  if (n === null) return "—";
  return n.toLocaleString(undefined, { style: "currency", currency: "AUD", maximumFractionDigits: 0 });
}

export function OptionsPanel({
  selectionId,
  options,
  chosenOptionId,
  editable,
}: {
  selectionId: string;
  options: SelectionOption[];
  chosenOptionId: string | null;
  editable: boolean;
}) {
  const router = useRouter();
  const supabase = createClient();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [cost, setCost] = useState("");
  const [supplier, setSupplier] = useState("");

  async function addOption(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    setError(null);

    const { error } = await supabase.from("selection_options").insert({
      selection_id: selectionId,
      name: name.trim(),
      description: description.trim() || null,
      cost: cost ? Number(cost) : null,
      supplier: supplier.trim() || null,
      sort_order: options.length,
    });

    setSaving(false);
    if (error) {
      setError(error.message);
      return;
    }
    setName("");
    setDescription("");
    setCost("");
    setSupplier("");
    setAdding(false);
    router.refresh();
  }

  async function removeOption(id: string) {
    setSaving(true);
    setError(null);
    const { error } = await supabase.from("selection_options").delete().eq("id", id);
    setSaving(false);
    if (error) {
      setError(error.message);
      return;
    }
    router.refresh();
  }

  return (
    <Card className="p-5">
      <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Options</h2>
      {error && <p className="mt-2 text-sm text-red-600 dark:text-red-400">{error}</p>}

      <div className="mt-3 space-y-2">
        {options.map((o) => (
          <div
            key={o.id}
            className={`flex items-center justify-between gap-3 rounded-lg border px-3 py-2.5 ${
              o.id === chosenOptionId
                ? "border-emerald-300 bg-emerald-50 dark:border-emerald-900/60 dark:bg-emerald-950/20"
                : "border-slate-200 dark:border-slate-800"
            }`}
          >
            <div className="min-w-0">
              <p className="text-sm text-slate-900 dark:text-slate-100">
                {o.name}
                {o.id === chosenOptionId && <span className="ml-2 text-xs font-medium text-emerald-700 dark:text-emerald-400">Chosen</span>}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {formatCurrency(o.cost)}
                {o.supplier && ` · ${o.supplier}`}
                {o.description && ` · ${o.description}`}
              </p>
            </div>
            {editable && (
              <button
                type="button"
                onClick={() => removeOption(o.id)}
                disabled={saving}
                className="shrink-0 text-xs text-slate-400 hover:text-red-600 disabled:opacity-50 dark:hover:text-red-400"
              >
                Remove
              </button>
            )}
          </div>
        ))}
        {!options.length && <p className="text-sm text-slate-500 dark:text-slate-400">No options added yet.</p>}
      </div>

      {editable &&
        (adding ? (
          <form onSubmit={addOption} className="mt-4 space-y-2 rounded-lg border border-slate-200 p-3 dark:border-slate-800">
            <div className="grid grid-cols-2 gap-2">
              <input value={name} onChange={(e) => setName(e.target.value)} required placeholder="Option name" className="field !py-1.5 text-xs" />
              <input type="number" value={cost} onChange={(e) => setCost(e.target.value)} placeholder="Cost ($)" className="field !py-1.5 text-xs" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <input value={supplier} onChange={(e) => setSupplier(e.target.value)} placeholder="Supplier (optional)" className="field !py-1.5 text-xs" />
              <input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Notes (optional)" className="field !py-1.5 text-xs" />
            </div>
            <div className="flex gap-2">
              <Button type="submit" size="sm" loading={saving}>Add option</Button>
              <button type="button" onClick={() => setAdding(false)} className="text-xs text-slate-500 hover:underline dark:text-slate-400">Cancel</button>
            </div>
          </form>
        ) : (
          <button type="button" onClick={() => setAdding(true)} className="mt-3 text-xs font-medium text-brand-orange hover:underline">
            + Add an option
          </button>
        ))}
    </Card>
  );
}
