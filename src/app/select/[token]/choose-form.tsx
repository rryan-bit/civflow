"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";

type Option = { id: string; name: string; description: string | null; cost: number | null; supplier: string | null };

function formatCurrency(n: number | null) {
  if (n === null) return null;
  return n.toLocaleString(undefined, { style: "currency", currency: "AUD", maximumFractionDigits: 0 });
}

export default function ChooseForm({ token, options }: { token: string; options: Option[] }) {
  const supabase = createClient();
  const [optionId, setOptionId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<{ name: string; optionName: string } | null>(null);

  async function handleChoose(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !optionId) return;
    setLoading(true);
    setError(null);

    const { data, error } = await supabase.rpc("choose_selection_by_token", {
      selection_token: token,
      option_id: optionId,
      chooser_name: name.trim(),
    });

    setLoading(false);

    if (error) {
      setError(error.message);
      return;
    }

    setDone({ name: data?.chosen_name ?? name.trim(), optionName: options.find((o) => o.id === optionId)?.name ?? "your choice" });
  }

  if (done) {
    return (
      <div className="mt-6 rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-300">
        Thanks, {done.name} — we&apos;ve recorded your choice of {done.optionName}.
      </div>
    );
  }

  return (
    <form onSubmit={handleChoose} className="mt-6 space-y-3 text-left">
      <div className="space-y-2">
        {options.map((o) => (
          <button
            type="button"
            key={o.id}
            onClick={() => setOptionId(o.id)}
            className={`w-full rounded-lg border px-3 py-2.5 text-left transition-colors ${
              optionId === o.id
                ? "border-brand-orange bg-orange-50 dark:bg-orange-950/30"
                : "border-slate-200 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/60"
            }`}
          >
            <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{o.name}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {o.cost !== null && formatCurrency(o.cost)}
              {o.cost !== null && o.supplier && " · "}
              {o.supplier}
            </p>
            {o.description && <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">{o.description}</p>}
          </button>
        ))}
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Your name</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          placeholder="Type your full name to confirm"
          className="field mt-1"
        />
      </div>
      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
      <Button type="submit" loading={loading} disabled={!optionId} className="w-full">
        {loading ? "Recording…" : "Confirm my choice"}
      </Button>
    </form>
  );
}
