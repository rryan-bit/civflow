"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export function SelectionActions({
  selectionId,
  status,
  optionCount,
}: {
  selectionId: string;
  status: "draft" | "awaiting_choice" | "chosen";
  optionCount: number;
}) {
  const router = useRouter();
  const supabase = createClient();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function sendToClient() {
    setSaving(true);
    setError(null);
    const { error } = await supabase.from("selections").update({ status: "awaiting_choice" }).eq("id", selectionId);
    setSaving(false);
    if (error) {
      setError(error.message);
      return;
    }
    router.refresh();
  }

  if (status !== "draft") return null;

  return (
    <Card className="p-5">
      <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Ready for the client?</h2>
      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
        Once you send it, the client&apos;s approval link will let them view the options and pick one — you won&apos;t
        be able to edit the options list after that without starting a new selection.
      </p>
      {error && <p className="mt-2 text-sm text-red-600 dark:text-red-400">{error}</p>}
      <Button onClick={sendToClient} loading={saving} disabled={optionCount < 2} className="mt-3">
        Send to client
      </Button>
      {optionCount < 2 && <p className="mt-2 text-xs text-amber-600 dark:text-amber-400">Add at least two options first.</p>}
    </Card>
  );
}
