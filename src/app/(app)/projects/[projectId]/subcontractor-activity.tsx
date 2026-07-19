"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export type SubcontractorActivityItem = {
  id: string;
  kind: "quote" | "update";
  subcontractorId: string;
  subcontractorName: string;
  label: string;
  createdAt: string;
  isUrgent?: boolean;
};

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("en-AU",{ month: "short", day: "numeric" });
}

/**
 * Surfaces subcontractor-submitted quotes (awaiting a decision) and posted
 * updates (unacknowledged) right on the project homepage — the whole point
 * being the builder doesn't have to go looking for it, it just shows up.
 */
export function SubcontractorActivity({ projectId, items }: { projectId: string; items: SubcontractorActivityItem[] }) {
  const router = useRouter();
  const supabase = createClient();
  const [acking, setAcking] = useState<string | null>(null);

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

  if (!items.length) return null;

  return (
    <Card className="mt-6 animate-slide-up p-5">
      <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Subcontractor activity</h2>
      <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
        Quotes and updates submitted through subcontractor portal links, waiting on you.
      </p>
      <ul className="mt-3 divide-y divide-slate-100 dark:divide-slate-800">
        {items.map((item) => (
          <li key={`${item.kind}-${item.id}`} className="flex items-center justify-between gap-3 py-2.5 text-sm">
            <Link href={`/projects/${projectId}/subcontractors/${item.subcontractorId}`} className="min-w-0 truncate text-slate-900 hover:underline dark:text-slate-100">
              <Badge tone={item.kind === "quote" ? "blue" : item.isUrgent ? "amber" : "neutral"} className="mr-2 align-middle">
                {item.kind === "quote" ? "Quote" : "Update"}
              </Badge>
              {item.subcontractorName}: {item.label}
              <span className="text-slate-400 dark:text-slate-500"> — {formatDate(item.createdAt)}</span>
            </Link>
            {item.kind === "update" && (
              <button
                type="button"
                onClick={() => acknowledge(item.id)}
                disabled={acking === item.id}
                className="shrink-0 text-xs font-medium text-brand-orange hover:underline disabled:opacity-50"
              >
                {acking === item.id ? "Saving…" : "Acknowledge"}
              </button>
            )}
          </li>
        ))}
      </ul>
    </Card>
  );
}
