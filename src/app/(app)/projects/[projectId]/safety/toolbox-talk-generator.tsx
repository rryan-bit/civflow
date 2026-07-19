"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

type Talk = { topic: string; talking_points: string[]; questions: string[] };

export function ToolboxTalkGenerator({ projectId }: { projectId: string }) {
  const [focus, setFocus] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [talk, setTalk] = useState<Talk | null>(null);

  async function handleGenerate() {
    setLoading(true);
    setError(null);
    setTalk(null);

    try {
      const res = await fetch(`/api/projects/${projectId}/safety/toolbox-talk`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ focus }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Couldn't generate a toolbox talk.");
        return;
      }
      setTalk(data);
    } catch {
      setError("Couldn't reach the AI drafting service.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="border-brand-orange/20 bg-gradient-to-br from-orange-50/60 to-transparent p-5 dark:from-orange-500/5">
      <h2 className="flex items-center gap-1.5 text-sm font-medium text-slate-800 dark:text-slate-200">
        <span className="text-brand-orange">✨</span> AI toolbox talk generator
      </h2>
      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
        Drafts a morning briefing grounded in this site&apos;s recent safety observations.
      </p>
      <div className="mt-3 flex items-end gap-3">
        <div className="flex-1">
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Focus (optional)</label>
          <input value={focus} onChange={(e) => setFocus(e.target.value)} placeholder="e.g. working at heights" className="field mt-1" />
        </div>
        <Button onClick={handleGenerate} loading={loading}>
          {loading ? "Generating…" : "Generate"}
        </Button>
      </div>

      {error && <p className="mt-2 text-sm text-red-600 dark:text-red-400">{error}</p>}

      {talk && (
        <div className="mt-4 animate-slide-up rounded-xl border border-slate-200/80 bg-white p-4 dark:border-slate-800 dark:bg-slate-900/60">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">{talk.topic}</h3>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-700 dark:text-slate-300">
            {talk.talking_points.map((p, i) => (
              <li key={i}>{p}</li>
            ))}
          </ul>
          {talk.questions.length > 0 && (
            <>
              <h4 className="mt-3 text-xs font-medium text-slate-500 dark:text-slate-400">Ask the crew</h4>
              <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-slate-700 dark:text-slate-300">
                {talk.questions.map((q, i) => (
                  <li key={i}>{q}</li>
                ))}
              </ul>
            </>
          )}
        </div>
      )}
    </Card>
  );
}
