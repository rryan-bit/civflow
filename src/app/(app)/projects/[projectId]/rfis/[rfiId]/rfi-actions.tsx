"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Rfi } from "@/types/database";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export function RfiActions({ rfi }: { rfi: Rfi }) {
  const router = useRouter();
  const supabase = createClient();

  const [answer, setAnswer] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleAnswer(e: React.FormEvent) {
    e.preventDefault();
    if (!answer.trim()) return;
    setSaving(true);
    setError(null);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { error } = await supabase
      .from("rfis")
      .update({
        answer: answer.trim(),
        answered_by: user?.id ?? null,
        answered_at: new Date().toISOString(),
        status: "answered",
      })
      .eq("id", rfi.id);

    setSaving(false);
    if (error) {
      setError(error.message);
      return;
    }
    router.refresh();
  }

  async function handleClose() {
    setSaving(true);
    setError(null);
    const { error } = await supabase.from("rfis").update({ status: "closed" }).eq("id", rfi.id);
    setSaving(false);
    if (error) {
      setError(error.message);
      return;
    }
    router.refresh();
  }

  if (rfi.status === "closed") return null;

  return (
    <Card className="p-5">
      {rfi.status === "open" && (
        <form onSubmit={handleAnswer} className="space-y-3">
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Answer this RFI</label>
          <textarea
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            rows={4}
            required
            placeholder="Type the response here"
            className="field"
          />
          {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
          <Button type="submit" loading={saving}>
            {saving ? "Saving…" : "Submit answer"}
          </Button>
        </form>
      )}

      {rfi.status === "answered" && (
        <>
          {error && <p className="mb-2 text-sm text-red-600 dark:text-red-400">{error}</p>}
          <Button variant="outline" onClick={handleClose} loading={saving}>
            {saving ? "Closing…" : "Close RFI"}
          </Button>
        </>
      )}
    </Card>
  );
}
