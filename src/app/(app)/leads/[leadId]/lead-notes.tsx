"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { LeadNote } from "@/types/database";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EmptyState, EmptyIcons } from "@/components/ui/empty-state";
import { useToast } from "@/components/ui/toast";

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

export function LeadNotes({
  leadId,
  notes,
  authorNames,
}: {
  leadId: string;
  notes: LeadNote[];
  authorNames: Record<string, string>;
}) {
  const authorName = (id: string | null) => (id ? authorNames[id] ?? "A team member" : "A team member");
  const router = useRouter();
  const supabase = createClient();
  const toast = useToast();

  const [body, setBody] = useState("");
  const [saving, setSaving] = useState(false);

  async function addNote() {
    if (!body.trim()) return;
    setSaving(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { error } = await supabase.from("lead_notes").insert({
      lead_id: leadId,
      body: body.trim(),
      created_by: user?.id ?? null,
    });

    setSaving(false);
    if (error) {
      toast({ title: "Couldn't add note", description: error.message, variant: "error" });
      return;
    }
    setBody("");
    router.refresh();
  }

  return (
    <div>
      <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300">
        Notes <span className="font-normal text-slate-400 dark:text-slate-500">({notes.length})</span>
      </h2>
      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Anything worth remembering about this lead — budget hints, timing, who else is quoting.</p>

      <Card className="mt-3 p-4">
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={2}
          placeholder="Add a note…"
          className="field"
        />
        <div className="mt-2 flex justify-end">
          <Button size="sm" loading={saving} disabled={!body.trim()} onClick={addNote}>Add note</Button>
        </div>
      </Card>

      {notes.length > 0 ? (
        <Card className="mt-3 divide-y divide-slate-100 overflow-hidden p-0 dark:divide-slate-800/80">
          {notes.map((n) => (
            <div key={n.id} className="px-4 py-3">
              <p className="whitespace-pre-wrap text-sm text-slate-900 dark:text-slate-100">{n.body}</p>
              <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                {authorName(n.created_by)} · {formatDateTime(n.created_at)}
              </p>
            </div>
          ))}
        </Card>
      ) : (
        <Card className="mt-3 p-0">
          <EmptyState icon={EmptyIcons.edit} title="No notes yet." className="px-4 py-8" />
        </Card>
      )}
    </div>
  );
}
