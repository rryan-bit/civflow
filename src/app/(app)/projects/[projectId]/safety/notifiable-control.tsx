"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type Props = {
  observationId: string;
  notifiable: boolean;
  reportedAt: string | null;
  reportReference: string | null;
  workcoverNotifiedAt: string | null;
  workcoverReference: string | null;
};

function formatDateTime(d: string) {
  return new Date(d).toLocaleString(undefined, { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

// Two separate regulators, two separate obligations for the same incident —
// easy to conflate, which is exactly what the old single "reported"
// checkbox did. Notifying WHSQ does NOT satisfy any WorkCover Queensland
// notification, and vice versa (both can apply to the one incident).
export function NotifiableControl({ observationId, notifiable, reportedAt, reportReference, workcoverNotifiedAt, workcoverReference }: Props) {
  const router = useRouter();
  const supabase = createClient();
  const [saving, setSaving] = useState(false);
  const [editingReport, setEditingReport] = useState(false);
  const [editingWorkcover, setEditingWorkcover] = useState(false);
  const [reference, setReference] = useState(reportReference ?? "");
  const [workcoverRef, setWorkcoverRef] = useState(workcoverReference ?? "");
  const [error, setError] = useState<string | null>(null);

  async function toggleNotifiable() {
    setSaving(true);
    setError(null);
    const { error } = await supabase
      .from("safety_observations")
      .update({ notifiable: !notifiable })
      .eq("id", observationId);
    setSaving(false);
    if (error) {
      setError(error.message);
      return;
    }
    router.refresh();
  }

  async function saveReport(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const { error } = await supabase
      .from("safety_observations")
      .update({ reported_at: new Date().toISOString(), report_reference: reference.trim() || null })
      .eq("id", observationId);
    setSaving(false);
    if (error) {
      setError(error.message);
      return;
    }
    setEditingReport(false);
    router.refresh();
  }

  async function saveWorkcover(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const { error } = await supabase
      .from("safety_observations")
      .update({ workcover_notified_at: new Date().toISOString(), workcover_reference: workcoverRef.trim() || null })
      .eq("id", observationId);
    setSaving(false);
    if (error) {
      setError(error.message);
      return;
    }
    setEditingWorkcover(false);
    router.refresh();
  }

  return (
    <div className="mt-2">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={toggleNotifiable}
          disabled={saving}
          className="rounded-full disabled:opacity-60"
        >
          <Badge tone={notifiable ? "red" : "neutral"} className="cursor-pointer">
            {notifiable ? "Notifiable incident" : "Mark as notifiable"}
          </Badge>
        </button>

        {notifiable && reportedAt && (
          <Badge tone="emerald">
            WHSQ notified {formatDateTime(reportedAt)}
            {reportReference ? ` · ${reportReference}` : ""}
          </Badge>
        )}

        {notifiable && !reportedAt && !editingReport && (
          <button
            type="button"
            onClick={() => setEditingReport(true)}
            className="text-xs font-medium text-brand-orange hover:underline"
          >
            Record as notified to WHSQ
          </button>
        )}

        {notifiable && workcoverNotifiedAt && (
          <Badge tone="emerald">
            WorkCover notified {formatDateTime(workcoverNotifiedAt)}
            {workcoverReference ? ` · ${workcoverReference}` : ""}
          </Badge>
        )}

        {notifiable && !workcoverNotifiedAt && !editingWorkcover && (
          <button
            type="button"
            onClick={() => setEditingWorkcover(true)}
            className="text-xs font-medium text-brand-orange hover:underline"
          >
            Record as notified to WorkCover
          </button>
        )}
      </div>

      {notifiable && (reportedAt || workcoverNotifiedAt) && (
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          These are two separate obligations — notifying WHSQ (s54A QBCC Act) doesn&apos;t cover WorkCover Queensland,
          and vice versa. Both may apply to the same incident.
        </p>
      )}

      {notifiable && editingReport && (
        <form onSubmit={saveReport} className="mt-2 flex flex-wrap items-center gap-2">
          <input
            type="text"
            value={reference}
            onChange={(e) => setReference(e.target.value)}
            placeholder="WHSQ incident reference (optional)"
            className="field !w-auto flex-1 !py-1.5 text-xs"
          />
          <Button type="submit" loading={saving} className="!px-3 !py-1.5 text-xs">
            Mark notified
          </Button>
          <button type="button" onClick={() => setEditingReport(false)} className="text-xs text-slate-500 hover:underline dark:text-slate-400">
            Cancel
          </button>
        </form>
      )}

      {notifiable && editingWorkcover && (
        <form onSubmit={saveWorkcover} className="mt-2 flex flex-wrap items-center gap-2">
          <input
            type="text"
            value={workcoverRef}
            onChange={(e) => setWorkcoverRef(e.target.value)}
            placeholder="WorkCover claim/reference (optional)"
            className="field !w-auto flex-1 !py-1.5 text-xs"
          />
          <Button type="submit" loading={saving} className="!px-3 !py-1.5 text-xs">
            Mark notified
          </Button>
          <button type="button" onClick={() => setEditingWorkcover(false)} className="text-xs text-slate-500 hover:underline dark:text-slate-400">
            Cancel
          </button>
        </form>
      )}

      {error && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{error}</p>}
    </div>
  );
}
