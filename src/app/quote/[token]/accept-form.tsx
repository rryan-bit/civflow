"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";

export default function AcceptForm({ token }: { token: string }) {
  const supabase = createClient();
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  async function handleAccept(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    setError(null);

    const { data, error } = await supabase.rpc("accept_quote_by_token", {
      quote_token: token,
      accepter_name: name.trim(),
    });

    setLoading(false);

    if (error) {
      setError(error.message);
      return;
    }

    setDone(data?.accepted_name ?? name.trim());
  }

  if (done) {
    return (
      <div className="mt-6 rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-300">
        Thanks, {done} — your acceptance has been recorded. The builder will be in touch to get things moving.
      </div>
    );
  }

  return (
    <form onSubmit={handleAccept} className="mt-6 space-y-3 text-left">
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
        {loading ? "Recording…" : "I accept this quote"}
      </Button>
      <p className="text-xs text-slate-500 dark:text-slate-400">
        By typing your name and tapping accept, you&apos;re confirming you&apos;d like to go ahead at this price.
      </p>
    </form>
  );
}
