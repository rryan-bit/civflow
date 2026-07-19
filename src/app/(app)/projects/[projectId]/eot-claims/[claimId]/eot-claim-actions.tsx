"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { EotClaim } from "@/types/database";
import { toDateInput } from "@/lib/dates";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export function EotClaimActions({ claim }: { claim: EotClaim }) {
  const router = useRouter();
  const supabase = createClient();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [noticeNote, setNoticeNote] = useState("");
  const [responseNote, setResponseNote] = useState(claim.client_response_note ?? "");

  async function markNoticeSent() {
    setSaving(true);
    setError(null);
    const { error } = await supabase
      .from("eot_claims")
      .update({ status: "notice_sent", notice_sent_at: new Date().toISOString(), notice_sent_note: noticeNote.trim() || null })
      .eq("id", claim.id);
    setSaving(false);
    if (error) {
      setError(error.message);
      return;
    }
    router.refresh();
  }

  async function resolve(status: "granted" | "rejected") {
    setSaving(true);
    setError(null);
    const { error } = await supabase
      .from("eot_claims")
      .update({ status, client_response_note: responseNote.trim() || null })
      .eq("id", claim.id);
    setSaving(false);
    if (error) {
      setError(error.message);
      return;
    }
    router.refresh();
  }

  return (
    <div className="space-y-4 print:hidden">
      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

      {claim.status === "open" && (
        <Card className="p-5">
          <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Record that notice was sent</h2>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Print the notice below to send it, then record it here — that record, with today&apos;s date, is your
            evidence you notified the client before the deadline.
          </p>
          <input
            value={noticeNote}
            onChange={(e) => setNoticeNote(e.target.value)}
            placeholder="How it was sent (e.g. emailed to jane@example.com)"
            className="field mt-3"
          />
          <Button onClick={markNoticeSent} loading={saving} className="mt-3">
            Mark notice sent today
          </Button>
        </Card>
      )}

      {claim.status === "notice_sent" && (
        <Card className="p-5">
          <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Client&apos;s response</h2>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Notice sent {claim.notice_sent_at ? toDateInput(new Date(claim.notice_sent_at)) : ""}
            {claim.notice_sent_note ? ` — ${claim.notice_sent_note}` : ""}.
          </p>
          <textarea
            value={responseNote}
            onChange={(e) => setResponseNote(e.target.value)}
            rows={2}
            placeholder="Any notes on the client's response (optional)"
            className="field mt-3"
          />
          <div className="mt-3 flex gap-2">
            <Button onClick={() => resolve("granted")} loading={saving} className="!bg-emerald-600 hover:!bg-emerald-700">
              Mark granted
            </Button>
            <Button variant="outline" onClick={() => resolve("rejected")} loading={saving}>
              Mark rejected
            </Button>
          </div>
        </Card>
      )}

      {(claim.status === "granted" || claim.status === "rejected") && claim.client_response_note && (
        <Card className="p-5">
          <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Outcome notes</h2>
          <p className="mt-1.5 text-sm text-slate-900 dark:text-slate-100">{claim.client_response_note}</p>
        </Card>
      )}
    </div>
  );
}
