"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { LeadFollowUp } from "@/types/database";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EmptyState, EmptyIcons } from "@/components/ui/empty-state";
import { useToast } from "@/components/ui/toast";

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

export function LeadFollowUps({
  leadId,
  followUps,
  authorNames,
}: {
  leadId: string;
  followUps: LeadFollowUp[];
  authorNames: Record<string, string>;
}) {
  const authorName = (id: string | null) => (id ? authorNames[id] ?? "A team member" : "A team member");
  const router = useRouter();
  const supabase = createClient();
  const toast = useToast();

  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  async function logFollowUp() {
    setSaving(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { error } = await supabase.from("lead_follow_ups").insert({
      lead_id: leadId,
      note: note.trim() || null,
      created_by: user?.id ?? null,
    });

    setSaving(false);
    if (error) {
      toast({ title: "Couldn't log follow-up", description: error.message, variant: "error" });
      return;
    }
    setNote("");
    toast({ title: "Follow-up logged", variant: "success" });
    router.refresh();
  }

  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300">
          Follow-ups <span className="font-normal text-slate-400 dark:text-slate-500">({followUps.length})</span>
        </h2>
      </div>
      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
        Log every time you actually make contact — a call, an email, dropping past site — so you can see how many
        times this lead has been chased.
      </p>

      <Card className="mt-3 p-4">
        <div className="flex items-start gap-2">
          <input
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="e.g. Called, left a voicemail — no answer"
            className="field flex-1"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                logFollowUp();
              }
            }}
          />
          <Button size="sm" loading={saving} onClick={logFollowUp}>Log follow-up</Button>
        </div>
      </Card>

      {followUps.length > 0 ? (
        <Card className="mt-3 divide-y divide-slate-100 overflow-hidden p-0 dark:divide-slate-800/80">
          {followUps.map((f) => (
            <div key={f.id} className="px-4 py-3">
              {f.note && <p className="text-sm text-slate-900 dark:text-slate-100">{f.note}</p>}
              <p className={`text-xs text-slate-500 dark:text-slate-400 ${f.note ? "mt-0.5" : ""}`}>
                {authorName(f.created_by)} · {formatDateTime(f.created_at)}
              </p>
            </div>
          ))}
        </Card>
      ) : (
        <Card className="mt-3 p-0">
          <EmptyState icon={EmptyIcons.clock} title="No follow-ups logged yet." className="px-4 py-8" />
        </Card>
      )}
    </div>
  );
}
