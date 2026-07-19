"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export function NewRfiForm({ projectId }: { projectId: string }) {
  const router = useRouter();
  const supabase = createClient();

  const [note, setNote] = useState("");
  const [subject, setSubject] = useState("");
  const [question, setQuestion] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [drafting, setDrafting] = useState(false);
  const [draftError, setDraftError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  async function handleDraft() {
    if (!note.trim()) return;
    setDrafting(true);
    setDraftError(null);

    try {
      const res = await fetch(`/api/projects/${projectId}/rfis/draft`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ note }),
      });
      const data = await res.json();
      if (!res.ok) {
        setDraftError(data.error ?? "Couldn't draft the RFI.");
        return;
      }
      setSubject(data.subject ?? "");
      setQuestion(data.question ?? "");
    } catch {
      setDraftError("Couldn't reach the AI drafting service.");
    } finally {
      setDrafting(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!subject.trim() || !question.trim()) return;
    setSaving(true);
    setSaveError(null);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { data, error } = await supabase
      .from("rfis")
      .insert({
        project_id: projectId,
        subject: subject.trim(),
        question: question.trim(),
        raised_by: user?.id ?? null,
        due_date: dueDate || null,
      })
      .select("id")
      .single();

    setSaving(false);

    if (error || !data) {
      setSaveError(error?.message ?? "Couldn't create the RFI.");
      return;
    }

    router.push(`/projects/${projectId}/rfis/${data.id}`);
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <Card className="animate-slide-up border-brand-orange/20 bg-gradient-to-br from-orange-50/60 to-transparent p-5 dark:from-orange-500/5">
        <div className="flex items-center gap-1.5 text-sm font-medium text-slate-800 dark:text-slate-200">
          <span className="text-brand-orange">✨</span> Describe the issue in your own words
        </div>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={3}
          placeholder="e.g. the drawings don't show a drainage point for the western retaining wall, need confirmation before we pour"
          className="field mt-2"
        />
        <Button type="button" variant="outline" size="sm" onClick={handleDraft} loading={drafting} disabled={!note.trim()} className="mt-3">
          {drafting ? "Drafting…" : "Draft with AI"}
        </Button>
        {draftError && <p className="mt-2 text-sm text-red-600 dark:text-red-400">{draftError}</p>}
      </Card>

      <Card className="p-5">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Subject</label>
            <input value={subject} onChange={(e) => setSubject(e.target.value)} required placeholder="Short subject line" className="field mt-1" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Question</label>
            <textarea
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              required
              rows={4}
              placeholder="Formally worded question for the design team / client"
              className="field mt-1"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Due date (optional)</label>
            <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="field mt-1 w-auto" />
          </div>

          {saveError && <p className="text-sm text-red-600 dark:text-red-400">{saveError}</p>}

          <Button type="submit" loading={saving}>
            {saving ? "Creating…" : "Create RFI"}
          </Button>
        </form>
      </Card>
    </div>
  );
}
