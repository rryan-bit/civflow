"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { SubcontractorUpdate } from "@/types/database";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const typeLabel: Record<string, string> = {
  general: "Update",
  delay_or_issue: "Delay or issue",
  stage_complete: "Stage complete",
};

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

export function UpdatesPanel({ updates }: { updates: SubcontractorUpdate[] }) {
  const router = useRouter();
  const supabase = createClient();
  const [acking, setAcking] = useState<string | null>(null);

  function photoUrl(path: string) {
    return supabase.storage.from("subcontractor-uploads").getPublicUrl(path).data.publicUrl;
  }

  async function acknowledge(updateId: string) {
    setAcking(updateId);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    await supabase
      .from("subcontractor_updates")
      .update({ acknowledged_at: new Date().toISOString(), acknowledged_by: user?.id ?? null })
      .eq("id", updateId);
    setAcking(null);
    router.refresh();
  }

  if (!updates.length) {
    return <p className="px-1 text-sm text-slate-500 dark:text-slate-400">No updates posted yet.</p>;
  }

  return (
    <Card className="divide-y divide-slate-100 overflow-hidden p-0 dark:divide-slate-800/80">
      {updates.map((u) => (
        <div key={u.id} className="px-4 py-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Badge tone={u.update_type === "delay_or_issue" ? "amber" : "neutral"}>{typeLabel[u.update_type] ?? "Update"}</Badge>
              <span className="text-xs text-slate-500 dark:text-slate-400">{formatDateTime(u.created_at)}</span>
            </div>
            {!u.acknowledged_at && (
              <button
                type="button"
                onClick={() => acknowledge(u.id)}
                disabled={acking === u.id}
                className="shrink-0 text-xs font-medium text-brand-orange hover:underline disabled:opacity-50"
              >
                {acking === u.id ? "Saving…" : "Acknowledge"}
              </button>
            )}
          </div>
          <p className="mt-1.5 text-sm text-slate-900 dark:text-slate-100">{u.message}</p>
          {u.photo_storage_path && (
            <a href={photoUrl(u.photo_storage_path)} target="_blank" rel="noopener noreferrer" className="mt-1 inline-block text-xs font-medium text-brand-orange hover:underline">
              View photo
            </a>
          )}
        </div>
      ))}
    </Card>
  );
}
