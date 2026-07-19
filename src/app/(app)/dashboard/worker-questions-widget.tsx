"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";

export type DashboardWorkerQuestion = {
  id: string;
  projectId: string;
  projectName: string;
  question: string;
  askerName: string;
  createdAt: string;
};

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("en-AU",{ month: "short", day: "numeric" });
}

/**
 * Company-wide "questions waiting on you" — the same reply mechanism as the
 * per-project Crew page, but rolled up across every project so an admin
 * doesn't have to go looking project by project.
 */
export function WorkerQuestionsWidget({ questions }: { questions: DashboardWorkerQuestion[] }) {
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

  if (!questions.length) return null;

  return (
    <div>
      <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Questions from the crew</h3>
      <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">Posted from field worker portals — waiting on an answer.</p>
      <ul className="mt-3 divide-y divide-slate-100 dark:divide-slate-800">
        {questions.map((q) => (
          <li key={q.id} className="py-3">
            <p className="text-xs text-slate-500 dark:text-slate-400">
              <Link href={`/projects/${q.projectId}/crew`} className="font-medium hover:underline">
                {q.projectName}
              </Link>{" "}
              · {q.askerName} · {formatDate(q.createdAt)}
            </p>
            <p className="mt-1 text-sm text-slate-900 dark:text-slate-100">{q.question}</p>

            {replyingId === q.id ? (
              <div className="mt-2 space-y-2">
                <textarea value={answer} onChange={(e) => setAnswer(e.target.value)} rows={2} className="field w-full" placeholder="Your answer" />
                <div className="flex gap-2">
                  <Button size="sm" loading={saving} onClick={() => submitAnswer(q.id)}>Send answer</Button>
                  <button type="button" onClick={() => setReplyingId(null)} className="text-xs text-slate-500 hover:underline dark:text-slate-400">Cancel</button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setReplyingId(q.id);
                  setAnswer("");
                }}
                className="mt-1.5 text-xs font-medium text-brand-orange hover:underline"
              >
                Reply
              </button>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
