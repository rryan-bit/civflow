"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { NonConformanceReport } from "@/types/database";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

function toDateInput(d: Date) {
  return d.toISOString().slice(0, 10);
}

export function NcrActions({ ncr }: { ncr: NonConformanceReport }) {
  const router = useRouter();
  const supabase = createClient();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function updateStatus(status: "closed" | "disputed") {
    setSaving(true);
    setError(null);
    const patch = status === "closed" ? { status, closed_date: toDateInput(new Date()) } : { status };
    const { error } = await supabase.from("non_conformance_reports").update(patch).eq("id", ncr.id);
    setSaving(false);
    if (error) {
      setError(error.message);
      return;
    }
    router.refresh();
  }

  if (ncr.status === "closed") return null;

  return (
    <Card className="p-5">
      {error && <p className="mb-2 text-sm text-red-600 dark:text-red-400">{error}</p>}
      <div className="flex flex-wrap gap-2">
        <Button onClick={() => updateStatus("closed")} loading={saving} className="!bg-emerald-600 hover:!bg-emerald-700">
          Mark closed
        </Button>
        {ncr.status !== "disputed" && (
          <Button variant="outline" onClick={() => updateStatus("disputed")} loading={saving}>
            Mark disputed
          </Button>
        )}
      </div>
    </Card>
  );
}
