"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { DocumentCategory, ProjectDocument } from "@/types/database";
import { Card } from "@/components/ui/card";
import { Badge, BadgeTone } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const categoryTone: Record<DocumentCategory, BadgeTone> = {
  contract: "blue",
  insurance: "purple",
  plans: "cyan",
  permit: "amber",
  other: "neutral",
};

const categoryLabel: Record<DocumentCategory, string> = {
  contract: "Contract",
  insurance: "Insurance",
  plans: "Plans",
  permit: "Permit",
  other: "Other",
};

export function DocumentsPanel({ projectId, documents }: { projectId: string; documents: ProjectDocument[] }) {
  const router = useRouter();
  const supabase = createClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [openingId, setOpeningId] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<DocumentCategory>("other");

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault();
    const file = fileInputRef.current?.files?.[0];
    if (!file || !title.trim()) return;
    setSaving(true);
    setError(null);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    const path = `documents/${projectId}/${crypto.randomUUID()}-${file.name}`;
    const { error: uploadError } = await supabase.storage.from("diary-media").upload(path, file);
    if (uploadError) {
      setSaving(false);
      setError(uploadError.message);
      return;
    }

    const { error: insertError } = await supabase.from("documents").insert({
      project_id: projectId,
      category,
      title: title.trim(),
      storage_path: path,
      file_name: file.name,
      uploaded_by: user?.id ?? null,
    });

    setSaving(false);
    if (insertError) {
      setError(insertError.message);
      return;
    }
    setTitle("");
    setCategory("other");
    if (fileInputRef.current) fileInputRef.current.value = "";
    router.refresh();
  }

  async function openDocument(doc: ProjectDocument) {
    setOpeningId(doc.id);
    const { data, error } = await supabase.storage.from("diary-media").createSignedUrl(doc.storage_path, 3600);
    setOpeningId(null);
    if (error || !data) {
      setError(error?.message ?? "Could not open this document.");
      return;
    }
    window.open(data.signedUrl, "_blank", "noopener,noreferrer");
  }

  async function deleteDocument(doc: ProjectDocument) {
    setSaving(true);
    setError(null);
    const { error } = await supabase.from("documents").delete().eq("id", doc.id);
    setSaving(false);
    if (error) {
      setError(error.message);
      return;
    }
    await supabase.storage.from("diary-media").remove([doc.storage_path]);
    router.refresh();
  }

  async function toggleClientVisible(doc: ProjectDocument) {
    setError(null);
    const { error } = await supabase.from("documents").update({ client_visible: !doc.client_visible }).eq("id", doc.id);
    if (error) {
      setError(error.message);
      return;
    }
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <Card className="divide-y divide-slate-100 overflow-hidden p-0 dark:divide-slate-800/80">
        {documents.map((d) => (
          <div key={d.id} className="flex items-center justify-between gap-3 px-4 py-3.5">
            <div className="min-w-0">
              <p className="truncate text-sm text-slate-900 dark:text-slate-100">{d.title}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">{d.file_name} · {d.created_at.slice(0, 10)}</p>
            </div>
            <div className="flex shrink-0 items-center gap-3">
              {d.client_visible && <Badge tone="emerald">Shared</Badge>}
              <Badge tone={categoryTone[d.category]}>{categoryLabel[d.category]}</Badge>
              <button
                type="button"
                onClick={() => toggleClientVisible(d)}
                className="text-xs font-medium text-slate-500 hover:underline dark:text-slate-400"
              >
                {d.client_visible ? "Stop sharing" : "Share with client"}
              </button>
              <button
                type="button"
                onClick={() => openDocument(d)}
                disabled={openingId === d.id}
                className="text-xs font-medium text-brand-orange hover:underline disabled:opacity-50"
              >
                {openingId === d.id ? "Opening…" : "Open"}
              </button>
              <button type="button" onClick={() => deleteDocument(d)} disabled={saving} className="text-xs text-slate-400 hover:text-red-600 disabled:opacity-50 dark:hover:text-red-400">
                Remove
              </button>
            </div>
          </div>
        ))}
        {!documents.length && <p className="px-4 py-8 text-center text-sm text-slate-500 dark:text-slate-400">No documents uploaded yet.</p>}
      </Card>

      <Card className="p-5">
        <h3 className="text-sm font-medium text-slate-700 dark:text-slate-300">Upload a document</h3>
        {error && <p className="mt-2 text-sm text-red-600 dark:text-red-400">{error}</p>}
        <form onSubmit={handleUpload} className="mt-3 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Title</label>
              <input value={title} onChange={(e) => setTitle(e.target.value)} required placeholder="e.g. Building contract" className="field mt-1" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Category</label>
              <select value={category} onChange={(e) => setCategory(e.target.value as DocumentCategory)} className="field mt-1">
                {(Object.keys(categoryLabel) as DocumentCategory[]).map((c) => (
                  <option key={c} value={c}>{categoryLabel[c]}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">File</label>
            <input ref={fileInputRef} type="file" required className="field mt-1 !py-1.5" />
          </div>
          <Button type="submit" loading={saving}>Upload</Button>
        </form>
      </Card>
    </div>
  );
}
