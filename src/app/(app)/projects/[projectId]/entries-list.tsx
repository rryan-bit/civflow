"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { DiaryEntryStatus } from "@/types/database";
import { Badge, BadgeTone } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

const statusTone: Record<string, BadgeTone> = {
  draft: "neutral",
  in_review: "amber",
  approved: "emerald",
};

type Entry = { id: string; entry_date: string; status: DiaryEntryStatus };

export default function EntriesList({ projectId, entries }: { projectId: string; entries: Entry[] }) {
  const [status, setStatus] = useState<DiaryEntryStatus | "all">("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const filtered = useMemo(() => {
    return entries.filter((e) => {
      if (status !== "all" && e.status !== status) return false;
      if (from && e.entry_date < from) return false;
      if (to && e.entry_date > to) return false;
      return true;
    });
  }, [entries, status, from, to]);

  const hasFilters = status !== "all" || from || to;

  return (
    <div>
      {entries.length > 0 && (
        <div className="mt-3 flex flex-wrap items-end gap-3">
          <div>
            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400">Status</label>
            <select value={status} onChange={(e) => setStatus(e.target.value as DiaryEntryStatus | "all")} className="field mt-1 w-auto py-1.5">
              <option value="all">All</option>
              <option value="draft">Draft</option>
              <option value="in_review">In review</option>
              <option value="approved">Approved</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400">From</label>
            <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="field mt-1 w-auto py-1.5" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400">To</label>
            <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="field mt-1 w-auto py-1.5" />
          </div>
          {hasFilters && (
            <button
              onClick={() => {
                setStatus("all");
                setFrom("");
                setTo("");
              }}
              className="text-xs text-slate-500 underline underline-offset-2 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
            >
              Clear filters
            </button>
          )}
        </div>
      )}

      <Card className="mt-3 divide-y divide-slate-100 overflow-hidden p-0 dark:divide-slate-800/80">
        {filtered.map((entry) => (
          <Link
            key={entry.id}
            href={`/projects/${projectId}/entries/${entry.id}`}
            className="flex items-center justify-between px-4 py-3 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/60"
          >
            <span className="text-sm text-slate-900 dark:text-slate-100">{entry.entry_date}</span>
            <Badge tone={statusTone[entry.status]}>{entry.status.replace("_", " ")}</Badge>
          </Link>
        ))}
        {entries.length === 0 && (
          <p className="px-4 py-6 text-sm text-slate-500 dark:text-slate-400">
            No entries yet. Start one from the field with the button above.
          </p>
        )}
        {entries.length > 0 && filtered.length === 0 && (
          <p className="px-4 py-6 text-sm text-slate-500 dark:text-slate-400">No entries match those filters.</p>
        )}
      </Card>
    </div>
  );
}
