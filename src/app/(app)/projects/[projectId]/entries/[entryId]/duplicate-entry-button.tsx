"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";

type LaborRow = { trade: string; worker_count: number; hours: number | null; notes: string | null };
type EquipmentRow = { equipment_name: string; hours_used: number | null; notes: string | null };

export default function DuplicateEntryButton({
  projectId,
  labor,
  equipment,
}: {
  projectId: string;
  labor: LaborRow[];
  equipment: EquipmentRow[];
}) {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDuplicate() {
    setLoading(true);
    setError(null);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { data: newEntry, error: entryError } = await supabase
      .from("diary_entries")
      .insert({ project_id: projectId, created_by: user!.id, status: "draft" })
      .select("id")
      .single();

    if (entryError || !newEntry) {
      setError(entryError?.message ?? "Couldn't create the new entry.");
      setLoading(false);
      return;
    }

    const inserts: PromiseLike<unknown>[] = [];

    if (labor.length) {
      inserts.push(
        supabase.from("labor_records").insert(
          labor.map((l) => ({ diary_entry_id: newEntry.id, trade: l.trade, worker_count: l.worker_count, hours: l.hours, notes: l.notes }))
        )
      );
    }
    if (equipment.length) {
      inserts.push(
        supabase.from("equipment_records").insert(
          equipment.map((e) => ({ diary_entry_id: newEntry.id, equipment_name: e.equipment_name, hours_used: e.hours_used, notes: e.notes }))
        )
      );
    }

    await Promise.all(inserts);

    router.push(`/projects/${projectId}/entries/${newEntry.id}`);
    router.refresh();
  }

  return (
    <div>
      <Button type="button" variant="outline" onClick={handleDuplicate} loading={loading} className="print:hidden">
        {loading ? "Duplicating…" : "Duplicate as new entry"}
      </Button>
      {error && <p className="mt-2 text-sm text-red-600 dark:text-red-400">{error}</p>}
    </div>
  );
}
