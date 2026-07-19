"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function ReminderRow({ id, title, dueDate, projectName }: { id: string; title: string; dueDate: string; projectName?: string }) {
  const router = useRouter();
  const supabase = createClient();
  const [saving, setSaving] = useState(false);

  async function complete() {
    setSaving(true);
    await supabase.from("reminders").update({ completed: true }).eq("id", id);
    setSaving(false);
    router.refresh();
  }

  async function remove() {
    setSaving(true);
    await supabase.from("reminders").delete().eq("id", id);
    setSaving(false);
    router.refresh();
  }

  return (
    <div className="flex items-center justify-between gap-3 px-4 py-3">
      <div className="min-w-0">
        <p className="truncate text-sm text-slate-900 dark:text-slate-100">{title}</p>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Due {dueDate}
          {projectName && ` · ${projectName}`}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-3">
        <button type="button" onClick={complete} disabled={saving} className="text-xs font-medium text-emerald-600 hover:underline disabled:opacity-50 dark:text-emerald-400">
          Done
        </button>
        <button type="button" onClick={remove} disabled={saving} className="text-xs font-medium text-slate-400 hover:underline disabled:opacity-50 dark:text-slate-500">
          Remove
        </button>
      </div>
    </div>
  );
}
