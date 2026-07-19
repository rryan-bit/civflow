"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export type CrewQuestion = {
  id: string;
  question: string;
  answer: string | null;
  createdAt: string;
  askerName: string;
};

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("en-AU",{ month: "short", day: "numeric" });
}

export function CrewQuestionsPanel({ questions }: { questions: CrewQuestion[] }) {
  const router = useRouter();
  const supabase = createClient();
  const [replyingId, setReplyingId] = useState<string | null>(null);
  const [answer, setAnswer] = useState("");
  const [saving, setSaving] = useState(false);

  async function submitAnswer(questionId: string) {
    if (!answer.trim()) return;
    setSaving(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    await supabase
      .from("worker_questions")
      .update({ answer: answer.trim(), answered_by: user?.id ?? null, answered_at: new Date().toISOString() })
      .eq("id", questionId);
    setSaving(false);
    setReplyingId(null);
    setAnswer("");
    router.refresh();
  }

  if (!questions.length) {
    return <p className="px-1 text-sm text-slate-500 dark:text-slate-400">No questions from the crew yet.</p>;
  }

  return (
    <Card className="divide-y divide-slate-100 overflow-hidden p-0 dark:divide-slate-800/80">
      {questions.map((q) => (
        <div key={q.id} className="px-4 py-3">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {q.askerName} · {formatDate(q.createdAt)}
          </p>
          <p className="mt-1 text-sm text-slate-900 dark:text-slate-100">{q.question}</p>

          {q.answer ? (
            <p className="mt-1.5 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-300">
              {q.answer}
            </p>
          ) : replyingId === q.id ? (
            <div className="mt-2 space-y-2">
              <textarea value={answer} onChange={(e) => setAnswer(e.target.value)} rows={2} className="field w-full" placeholder="Your answer" />
              <div className="flex gap-2">
                <Button size="sm" loading={saving} onClick={() => submitAnswer(q.id)}>Send answer</Button>
                <button type="button" onClick={() => setReplyingId(null)} className="text-xs text-slate-500 hover:underline dark:text-slate-400">Cancel</button>
              </div>
            </div>
          ) : (
            <div className="mt-1.5 flex items-center gap-2">
              <Badge tone="amber">Unanswered</Badge>
              <button type="button" onClick={() => { setReplyingId(q.id); setAnswer(""); }} className="text-xs font-medium text-brand-orange hover:underline">
                Reply
              </button>
            </div>
          )}
        </div>
      ))}
    </Card>
  );
}
