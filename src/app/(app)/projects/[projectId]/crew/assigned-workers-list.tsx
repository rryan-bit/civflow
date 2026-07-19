"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Card } from "@/components/ui/card";

export function AssignedWorkersList({
  workers,
}: {
  workers: { assignmentId: string; profileId: string; fullName: string | null }[];
}) {
  const router = useRouter();
  const supabase = createClient();
  const [removingId, setRemovingId] = useState<string | null>(null);

  async function remove(assignmentId: string) {
    setRemovingId(assignmentId);
    await supabase.from("project_workers").delete().eq("id", assignmentId);
    setRemovingId(null);
    router.refresh();
  }

  if (!workers.length) {
    return <p className="px-1 text-sm text-slate-500 dark:text-slate-400">No workers assigned to this project yet.</p>;
  }

  return (
    <Card className="divide-y divide-slate-100 overflow-hidden p-0 dark:divide-slate-800/80">
      {workers.map((w) => (
        <div key={w.assignmentId} className="flex items-center justify-between px-4 py-3 text-sm">
          <span className="text-slate-900 dark:text-slate-100">{w.fullName ?? "Unnamed"}</span>
          <button
            type="button"
            onClick={() => remove(w.assignmentId)}
            disabled={removingId === w.assignmentId}
            className="text-xs font-medium text-slate-400 hover:text-red-600 hover:underline disabled:opacity-50 dark:hover:text-red-400"
          >
            {removingId === w.assignmentId ? "Removing…" : "Remove"}
          </button>
        </div>
      ))}
    </Card>
  );
}
