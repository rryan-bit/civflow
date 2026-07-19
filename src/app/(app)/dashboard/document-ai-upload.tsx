"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

type UploadResult = { title: string; category: string; recordType: string; summary: string; href: string };

export function DocumentAiUpload({ projects }: { projects: { id: string; name: string }[] }) {
  const supabase = createClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [projectId, setProjectId] = useState(projects[0]?.id ?? "");
  const [instruction, setInstruction] = useState("");
  const [stage, setStage] = useState<"idle" | "uploading" | "reading">("idle");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<UploadResult | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const file = fileInputRef.current?.files?.[0];
    if (!file || !projectId) return;
    setError(null);
    setResult(null);

    setStage("uploading");
    const path = `documents/${projectId}/${crypto.randomUUID()}-${file.name}`;
    const { error: uploadError } = await supabase.storage.from("diary-media").upload(path, file);
    if (uploadError) {
      setStage("idle");
      setError(uploadError.message);
      return;
    }

    setStage("reading");
    try {
      const res = await fetch(`/api/projects/${projectId}/documents/ai-file`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ storagePath: path, fileName: file.name, instruction: instruction.trim() || undefined }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Couldn't file that document.");
        return;
      }
      setResult(data as UploadResult);
      setInstruction("");
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch {
      setError("Something went wrong reaching the AI. Try again.");
    } finally {
      setStage("idle");
    }
  }

  if (!projects.length) return null;

  return (
    <Card className="mt-6 animate-slide-up p-5">
      <div className="flex items-center gap-2">
        <span className="text-brand-orange">✨</span>
        <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Upload a document</h2>
      </div>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
        Drop in a photo or PDF — a supplier invoice, a subbie&apos;s quote, your own payment claim, a QBCC notice —
        pick the project, and CivFlow will file it under Documents and fill out the matching record for you.
      </p>

      <form onSubmit={handleSubmit} className="mt-3 space-y-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Project</label>
            <select value={projectId} onChange={(e) => setProjectId(e.target.value)} className="field mt-1">
              {projects.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">File</label>
            <input ref={fileInputRef} type="file" required accept="image/*,.pdf" className="field mt-1 !py-1.5" />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Note (optional)</label>
          <input
            type="text"
            value={instruction}
            onChange={(e) => setInstruction(e.target.value)}
            placeholder="e.g. this is a quote from ABC Plumbing for the fence"
            className="field mt-1"
          />
        </div>

        {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

        <Button type="submit" loading={stage !== "idle"}>
          {stage === "uploading" ? "Uploading…" : stage === "reading" ? "Reading document…" : "Upload & file"}
        </Button>
      </form>

      {result && (
        <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm dark:border-emerald-900/50 dark:bg-emerald-950/30">
          <p className="text-emerald-800 dark:text-emerald-300">{result.summary}</p>
          <Link href={result.href} className="mt-1 inline-block text-xs font-medium text-brand-orange hover:underline">
            View
          </Link>
        </div>
      )}
    </Card>
  );
}
