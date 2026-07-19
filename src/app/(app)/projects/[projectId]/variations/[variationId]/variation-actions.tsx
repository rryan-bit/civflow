"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Variation, VariationStatus } from "@/types/database";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export function VariationActions({ variation }: { variation: Variation }) {
  const router = useRouter();
  const supabase = createClient();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function updateStatus(status: "submitted" | "approved" | "rejected") {
    setSaving(true);
    setError(null);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    const patch: { status: VariationStatus; approved_by?: string | null; approved_at?: string | null } = { status };
    if (status === "approved" || status === "rejected") {
      patch.approved_by = user?.id ?? null;
      patch.approved_at = new Date().toISOString();
    }

    const { error } = await supabase.from("variations").update(patch).eq("id", variation.id);
    setSaving(false);
    if (error) {
      setError(error.message);
      return;
    }
    router.refresh();
  }

  async function toggleWorkStarted() {
    setSaving(true);
    setError(null);
    const { error } = await supabase
      .from("variations")
      .update({
        work_started: !variation.work_started,
        work_started_date: !variation.work_started ? new Date().toISOString().slice(0, 10) : null,
      })
      .eq("id", variation.id);
    setSaving(false);
    if (error) {
      setError(error.message);
      return;
    }
    router.refresh();
  }

  const workStartedRisk = variation.work_started && !variation.client_approved_at;

  return (
    <div className="space-y-4 print:hidden">
      {workStartedRisk && (
        <Card className="border-red-200/80 bg-red-50 p-4 dark:border-red-900/50 dark:bg-red-950/20">
          <p className="text-sm font-medium text-red-900 dark:text-red-300">
            Work has started but the client hasn&apos;t signed off on this variation yet. Under QLD&apos;s Domestic
            Building Contracts Act, that puts recovering this cost at real risk if it&apos;s disputed later — send
            the approval link below before going further, if possible.
          </p>
        </Card>
      )}

      {variation.status !== "approved" && variation.status !== "rejected" && (
        <Card className="p-5">
          <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Internal status</h2>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            This just tracks your own team&apos;s review — it&apos;s not evidence the client agreed to the cost. Use
            the client approval link for that.
          </p>
          {error && <p className="mb-2 mt-2 text-sm text-red-600 dark:text-red-400">{error}</p>}
          <div className="mt-3 flex gap-2">
            {variation.status === "draft" && (
              <Button onClick={() => updateStatus("submitted")} loading={saving}>
                Submit for approval
              </Button>
            )}
            {variation.status === "submitted" && (
              <>
                <Button
                  onClick={() => updateStatus("approved")}
                  loading={saving}
                  className="!bg-emerald-600 hover:!bg-emerald-700"
                >
                  Mark approved internally
                </Button>
                <Button variant="outline" onClick={() => updateStatus("rejected")} loading={saving}>
                  Reject
                </Button>
              </>
            )}
          </div>
        </Card>
      )}

      <Card className="p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Work started on site</h2>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
              {variation.work_started
                ? `Marked started ${variation.work_started_date ?? ""}`
                : "Not started yet, as far as CivFlow knows."}
            </p>
          </div>
          <Button variant="outline" onClick={toggleWorkStarted} loading={saving}>
            {variation.work_started ? "Mark not started" : "Mark started"}
          </Button>
        </div>
      </Card>
    </div>
  );
}
