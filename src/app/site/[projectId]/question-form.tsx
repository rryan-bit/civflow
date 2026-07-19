"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";

export function QuestionForm({ projectId }: { projectId: string }) {
  const router = useRouter();
  const supabase = createClient();

  const [question, setQuestion] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!question.trim()) return;
    setSaving(true);
    setError(null);

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setSaving(false);
      setError("Not signed in.");
      return;
    }

    const { error: insertError } = await supabase.from("worker_questions").insert({
      project_id: projectId,
      asked_by: user.id,
      question: question.trim(),
    });

    setSaving(false);
    if (insertError) {
      setError(insertError.message);
      return;
    }

    setQuestion("");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="mt-3 space-y-3">
      <textarea
        value={question}
        onChange={(e) => setQuestion(e.target.value)}
        rows={2}
        placeholder="e.g. Where should the extra bricks go?"
        className="field w-full"
      />
      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
      <Button type="submit" size="sm" loading={saving}>Send question</Button>
    </form>
  );
}
