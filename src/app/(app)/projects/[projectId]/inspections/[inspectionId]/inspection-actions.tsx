"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import type { Inspection, InspectionStatus } from "@/types/database";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

function toDateInput(d: Date) {
  return d.toISOString().slice(0, 10);
}

export function InspectionActions({ inspection }: { inspection: Inspection }) {
  const router = useRouter();
  const supabase = createClient();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [inspectorName, setInspectorName] = useState(inspection.inspector_name ?? "");

  async function recordResult(status: InspectionStatus) {
    if (!inspectorName.trim()) {
      setError("Enter the inspector's name before recording a result.");
      return;
    }
    setSaving(true);
    setError(null);
    const { error } = await supabase
      .from("inspections")
      .update({ status, inspected_date: toDateInput(new Date()), inspector_name: inspectorName.trim() })
      .eq("id", inspection.id);
    setSaving(false);
    if (error) {
      setError(error.message);
      return;
    }
    router.refresh();
  }

  if (inspection.status !== "pending") {
    return (
      <Card className="p-5">
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Result recorded. {inspection.status === "failed" && "Raise a non-conformance report if one hasn't been logged."}
        </p>
        {inspection.status === "failed" && (
          <Link
            href={`/projects/${inspection.project_id}/ncrs/new?inspectionId=${inspection.id}`}
            className="mt-3 inline-block text-sm font-medium text-brand-orange hover:underline"
          >
            + Raise NCR
          </Link>
        )}
      </Card>
    );
  }

  return (
    <Card className="p-5">
      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Inspector name</label>
      <input
        type="text"
        value={inspectorName}
        onChange={(e) => setInspectorName(e.target.value)}
        placeholder="Who carried out the inspection?"
        className="field mt-1"
      />

      {error && <p className="mt-2 text-sm text-red-600 dark:text-red-400">{error}</p>}

      <div className="mt-3 flex flex-wrap gap-2">
        <Button onClick={() => recordResult("passed")} loading={saving} className="!bg-emerald-600 hover:!bg-emerald-700">
          Passed
        </Button>
        <Button variant="outline" onClick={() => recordResult("passed_with_notes")} loading={saving}>
          Passed with notes
        </Button>
        <Button variant="danger" onClick={() => recordResult("failed")} loading={saving}>
          Failed
        </Button>
      </div>
    </Card>
  );
}
