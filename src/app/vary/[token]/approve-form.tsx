"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";

export default function ApproveForm({ token }: { token: string }) {
  const supabase = createClient();
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  async function handleApprove(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    setError(null);

    const { data, error } = await supabase.rpc("approve_variation_by_token", {
      variation_token: token,
      approver_name: name.trim(),
    });

    setLoading(false);

    if (error) {
      setError(error.message);
      return;
    }

    setDone(data?.approved_name ?? name.trim());
  }

  if (done) {
    return (
      <div className="mt-6 rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-300">
        Thanks, {done} — your approval has been recorded with today&apos;s date and time.
      </div>
    );
  }

  return (
    <form onSubmit={handleApprove} className="mt-6 space-y-3 text-left">
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
      <Button type="submit" loading={loading} className="w-full">
        {loading ? "Recording…" : "I approve this variation"}
      </Button>
      <p className="text-xs text-slate-500 dark:text-slate-400">
        By typing your name and tapping approve, you&apos;re confirming you accept the scope and cost described above.
      </p>
    </form>
  );
}
