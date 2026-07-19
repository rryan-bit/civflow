"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { SubcontractorUpdateType } from "@/types/database";
import { Button } from "@/components/ui/button";

const UPDATE_TYPES: { value: SubcontractorUpdateType; label: string }[] = [
  { value: "general", label: "General update" },
  { value: "delay_or_issue", label: "Delay or issue" },
  { value: "stage_complete", label: "Finished a stage" },
];

export function UpdateForm({ token }: { token: string }) {
  const router = useRouter();
  const supabase = createClient();

  const [message, setMessage] = useState("");
  const [updateType, setUpdateType] = useState<SubcontractorUpdateType>("general");
  const [photo, setPhoto] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!message.trim()) {
      setError("Write a quick note before sending.");
      return;
    }
    setSaving(true);
    setError(null);

    let photoPath: string | null = null;
    if (photo) {
      const path = `${token}/updates/${crypto.randomUUID()}-${photo.name}`;
      const { error: uploadError } = await supabase.storage.from("subcontractor-uploads").upload(path, photo, {
        contentType: photo.type || undefined,
      });
      if (uploadError) {
        setSaving(false);
        setError(uploadError.message);
        return;
      }
      photoPath = path;
    }

    const { error: rpcError } = await supabase.rpc("submit_subcontractor_update_by_token", {
      sub_token: token,
      update_message: message.trim(),
      update_kind: updateType,
      update_photo_path: photoPath,
    });

    setSaving(false);
    if (rpcError) {
      setError(rpcError.message);
      return;
    }

    setMessage("");
    setPhoto(null);
    setUpdateType("general");
    setSubmitted(true);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="mt-3 space-y-3">
      <div>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Type</label>
        <select
          value={updateType}
          onChange={(e) => setUpdateType(e.target.value as SubcontractorUpdateType)}
          className="field mt-1 !w-auto"
        >
          {UPDATE_TYPES.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">What&apos;s happening?</label>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={3}
          placeholder="e.g. Frame stage finished, ready for inspection"
          className="field mt-1 w-full"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Add a photo (optional)</label>
        <input
          type="file"
          accept="image/*"
          onChange={(e) => setPhoto(e.target.files?.[0] ?? null)}
          className="mt-1 block w-full text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-slate-100 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-slate-700 dark:text-slate-400 dark:file:bg-slate-800 dark:file:text-slate-300"
        />
      </div>
      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
      {submitted && !error && <p className="text-sm text-emerald-600 dark:text-emerald-400">Update sent to the builder.</p>}
      <Button type="submit" size="sm" loading={saving}>Post update</Button>
    </form>
  );
}
