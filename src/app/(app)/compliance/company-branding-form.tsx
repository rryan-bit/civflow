"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";

/**
 * Company name + logo — admin-only. The logo replaces the CivFlow mark on
 * every printed/PDF document (diary entries, variations, client report).
 * Uploaded to the public `company-logos` bucket at a fixed `<companyId>/logo`
 * path so a new upload is a simple overwrite, no old-file cleanup needed.
 */
export function CompanyBrandingForm({
  companyId,
  companyName,
  logoUrl,
}: {
  companyId: string;
  companyName: string;
  logoUrl: string | null;
}) {
  const router = useRouter();
  const supabase = createClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState(companyName);
  const [savingName, setSavingName] = useState(false);
  const [nameSaved, setNameSaved] = useState(false);
  const [nameError, setNameError] = useState<string | null>(null);

  const [uploading, setUploading] = useState(false);
  const [logoError, setLogoError] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(logoUrl);

  async function handleSaveName(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setSavingName(true);
    setNameError(null);
    setNameSaved(false);
    const { error } = await supabase.from("companies").update({ name: name.trim() }).eq("id", companyId);
    setSavingName(false);
    if (error) {
      setNameError(error.message);
      return;
    }
    setNameSaved(true);
    router.refresh();
  }

  async function handleLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setLogoError("Please choose an image file.");
      return;
    }
    setUploading(true);
    setLogoError(null);

    const path = `${companyId}/logo`;
    const { error: uploadError } = await supabase.storage.from("company-logos").upload(path, file, {
      upsert: true,
      contentType: file.type,
    });
    if (uploadError) {
      setUploading(false);
      setLogoError(uploadError.message);
      return;
    }

    const { error: updateError } = await supabase.from("companies").update({ logo_storage_path: path }).eq("id", companyId);
    setUploading(false);
    if (updateError) {
      setLogoError(updateError.message);
      return;
    }

    const { data } = supabase.storage.from("company-logos").getPublicUrl(path);
    // Cache-bust so the new logo shows immediately instead of a stale cached image.
    setPreview(`${data.publicUrl}?t=${Date.now()}`);
    router.refresh();
  }

  async function handleRemoveLogo() {
    setUploading(true);
    setLogoError(null);
    const { error } = await supabase.from("companies").update({ logo_storage_path: null }).eq("id", companyId);
    setUploading(false);
    if (error) {
      setLogoError(error.message);
      return;
    }
    setPreview(null);
    router.refresh();
  }

  return (
    <div className="mt-3 space-y-6">
      <form onSubmit={handleSaveName} className="flex flex-wrap items-end gap-3">
        <div className="min-w-[200px] flex-1">
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Company name</label>
          <input value={name} onChange={(e) => setName(e.target.value)} className="field mt-1" />
        </div>
        <Button type="submit" loading={savingName}>
          {savingName ? "Saving…" : nameSaved ? "Saved ✓" : "Save name"}
        </Button>
      </form>
      {nameError && <p className="text-sm text-red-600 dark:text-red-400">{nameError}</p>}

      <div>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Company logo</label>
        <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
          Shown instead of the CivFlow mark on printed diary entries, variations, and the client report.
        </p>
        <div className="mt-2 flex items-center gap-3">
          {preview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={preview} alt="Company logo" className="h-14 w-14 rounded-lg border border-slate-200 object-contain dark:border-slate-800" />
          ) : (
            <div className="flex h-14 w-14 items-center justify-center rounded-lg border border-dashed border-slate-300 text-xs text-slate-400 dark:border-slate-700 dark:text-slate-500">
              None
            </div>
          )}
          <input ref={fileInputRef} type="file" accept="image/*" onChange={handleLogoChange} className="hidden" />
          <Button variant="outline" type="button" onClick={() => fileInputRef.current?.click()} loading={uploading}>
            {uploading ? "Uploading…" : preview ? "Replace logo" : "Upload logo"}
          </Button>
          {preview && (
            <Button variant="outline" type="button" onClick={handleRemoveLogo} disabled={uploading}>
              Remove
            </Button>
          )}
        </div>
        {logoError && <p className="mt-2 text-sm text-red-600 dark:text-red-400">{logoError}</p>}
      </div>
    </div>
  );
}
