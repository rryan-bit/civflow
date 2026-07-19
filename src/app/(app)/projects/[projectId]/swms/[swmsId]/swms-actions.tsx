"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Swms, SwmsStatus } from "@/types/database";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

function toDateInput(d: Date) {
  return d.toISOString().slice(0, 10);
}

export function SwmsActions({ swms }: { swms: Swms }) {
  const router = useRouter();
  const supabase = createClient();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function setStatus(status: SwmsStatus) {
    setSaving(true);
    setError(null);
    const { error } = await supabase.from("swms").update({ status }).eq("id", swms.id);
    setSaving(false);
    if (error) {
      setError(error.message);
      return;
    }
    router.refresh();
  }

  async function markReviewed() {
    setSaving(true);
    setError(null);
    const nextReview = toDateInput(new Date(Date.now() + 365 * 24 * 60 * 60 * 1000));
    const { error } = await supabase
      .from("swms")
      .update({ status: "current", received_date: toDateInput(new Date()), review_due_date: nextReview })
      .eq("id", swms.id);
    setSaving(false);
    if (error) {
      setError(error.message);
      return;
    }
    router.refresh();
  }

  if (swms.status === "superseded") return null;

  return (
    <Card className="p-5">
      {error && <p className="mb-2 text-sm text-red-600 dark:text-red-400">{error}</p>}
      <div className="flex flex-wrap gap-2">
        <Button onClick={markReviewed} loading={saving} className="!bg-emerald-600 hover:!bg-emerald-700">
          Mark reviewed (reset 12mo)
        </Button>
        {swms.status !== "expired" && (
          <Button variant="outline" onClick={() => setStatus("expired")} loading={saving}>
            Mark expired
          </Button>
        )}
        <Button variant="outline" onClick={() => setStatus("superseded")} loading={saving}>
          Mark superseded
        </Button>
      </div>
    </Card>
  );
}
