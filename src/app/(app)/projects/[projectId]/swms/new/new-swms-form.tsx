"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

function toDateInput(d: Date) {
  return d.toISOString().slice(0, 10);
}

const today = toDateInput(new Date());
const defaultReviewDue = toDateInput(new Date(Date.now() + 365 * 24 * 60 * 60 * 1000));

export function NewSwmsForm({
  projectId,
  subcontractors,
  defaultSubcontractorId,
}: {
  projectId: string;
  subcontractors: { id: string; company_name: string }[];
  defaultSubcontractorId: string;
}) {
  const router = useRouter();
  const supabase = createClient();

  const [title, setTitle] = useState("");
  const [subcontractorId, setSubcontractorId] = useState(defaultSubcontractorId);
  const [receivedDate, setReceivedDate] = useState(today);
  const [reviewDueDate, setReviewDueDate] = useState(defaultReviewDue);
  const [documentReference, setDocumentReference] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    setSaving(true);
    setError(null);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { data, error } = await supabase
      .from("swms")
      .insert({
        project_id: projectId,
        subcontractor_id: subcontractorId || null,
        title: title.trim(),
        received_date: receivedDate || null,
        review_due_date: reviewDueDate || null,
        document_reference: documentReference.trim() || null,
        notes: notes.trim() || null,
        created_by: user?.id ?? null,
        status: "current",
      })
      .select("id")
      .single();

    setSaving(false);

    if (error || !data) {
      setError(error?.message ?? "Couldn't add the SWMS.");
      return;
    }

    router.push(`/projects/${projectId}/swms/${data.id}`);
    router.refresh();
  }

  return (
    <Card className="p-5">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Title / high-risk activity</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            placeholder="e.g. Working at heights — roof framing"
            className="field mt-1"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Subcontractor</label>
          <select value={subcontractorId} onChange={(e) => setSubcontractorId(e.target.value)} className="field mt-1">
            <option value="">General / company</option>
            {subcontractors.map((s) => (
              <option key={s.id} value={s.id}>{s.company_name}</option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Received date</label>
            <input type="date" value={receivedDate} onChange={(e) => setReceivedDate(e.target.value)} className="field mt-1" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Review due</label>
            <input type="date" value={reviewDueDate} onChange={(e) => setReviewDueDate(e.target.value)} className="field mt-1" />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Document reference (optional)</label>
          <input
            type="text"
            value={documentReference}
            onChange={(e) => setDocumentReference(e.target.value)}
            placeholder="Filing reference or link to the stored document"
            className="field mt-1"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Notes (optional)</label>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} className="field mt-1" />
        </div>

        {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

        <Button type="submit" loading={saving}>
          {saving ? "Adding…" : "Add SWMS"}
        </Button>
      </form>
    </Card>
  );
}
