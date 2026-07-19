"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export function DraftUpdate({ projectId }: { projectId: string }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [copied, setCopied] = useState(false);

  async function handleDraft() {
    setLoading(true);
    setError(null);
    setCopied(false);
    try {
      const res = await fetch(`/api/projects/${projectId}/draft-update`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Couldn't draft an update.");
        return;
      }
      setDraft(data.draft);
    } catch {
      setError("Couldn't reach the AI assistant.");
    } finally {
      setLoading(false);
    }
  }

  async function handleCopy() {
    if (!draft) return;
    await navigator.clipboard.writeText(draft);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <Card className="mt-4 p-5 print:hidden">
      <div className="flex items-center gap-2">
        <span className="text-brand-orange">✨</span>
        <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Draft an update for the client</h2>
      </div>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
        A short, ready-to-send paragraph based on recent progress — review and edit before you send it.
      </p>

      {!draft && (
        <Button variant="outline" className="mt-3" onClick={handleDraft} loading={loading}>
          {loading ? "Drafting…" : "Draft an update"}
        </Button>
      )}

      {error && <p className="mt-2 text-sm text-red-600 dark:text-red-400">{error}</p>}

      {draft && (
        <div className="mt-3 space-y-2">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={5}
            className="field w-full"
          />
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={handleCopy}>{copied ? "Copied!" : "Copy"}</Button>
            <Button variant="outline" onClick={handleDraft} loading={loading}>
              {loading ? "Redrafting…" : "Redraft"}
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}
