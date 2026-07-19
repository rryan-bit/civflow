"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { DirectionToRectify, DtrStatus } from "@/types/database";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export function DtrActions({ dtr }: { dtr: DirectionToRectify }) {
  const router = useRouter();
  const supabase = createClient();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function updateStatus(status: DtrStatus) {
    setSaving(true);
    setError(null);
    const { error } = await supabase.from("directions_to_rectify").update({ status }).eq("id", dtr.id);
    setSaving(false);
    if (error) {
      setError(error.message);
      return;
    }
    router.refresh();
  }

  if (dtr.status === "rectified") return null;

  return (
    <Card className="p-5">
      {error && <p className="mb-2 text-sm text-red-600 dark:text-red-400">{error}</p>}
      <div className="flex flex-wrap gap-2">
        <Button onClick={() => updateStatus("rectified")} loading={saving} className="!bg-emerald-600 hover:!bg-emerald-700">
          Mark rectified
        </Button>
        {dtr.status !== "disputed" && (
          <Button variant="outline" onClick={() => updateStatus("disputed")} loading={saving}>
            Mark disputed
          </Button>
        )}
      </div>
    </Card>
  );
}
