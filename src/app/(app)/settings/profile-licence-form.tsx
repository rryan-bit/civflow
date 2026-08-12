"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";

type ProfileFields = {
  id: string;
  qbcc_licence_number: string | null;
  qbcc_licence_class: string | null;
  qbcc_licence_expiry: string | null;
} | null;

export function ProfileLicenceForm({ profile }: { profile: ProfileFields }) {
  const router = useRouter();
  const supabase = createClient();

  const [licenceNumber, setLicenceNumber] = useState(profile?.qbcc_licence_number ?? "");
  const [licenceClass, setLicenceClass] = useState(profile?.qbcc_licence_class ?? "");
  const [licenceExpiry, setLicenceExpiry] = useState(profile?.qbcc_licence_expiry ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!profile) return;
    setSaving(true);
    setError(null);
    setSaved(false);

    const { error } = await supabase
      .from("profiles")
      .update({
        qbcc_licence_number: licenceNumber.trim() || null,
        qbcc_licence_class: licenceClass.trim() || null,
        qbcc_licence_expiry: licenceExpiry || null,
      })
      .eq("id", profile.id);

    setSaving(false);

    if (error) {
      setError(error.message);
      return;
    }

    setSaved(true);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="mt-3 space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Licence number</label>
          <input value={licenceNumber} onChange={(e) => setLicenceNumber(e.target.value)} placeholder="e.g. 1234567" className="field mt-1" />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Licence class</label>
          <input
            value={licenceClass}
            onChange={(e) => setLicenceClass(e.target.value)}
            placeholder="e.g. Site Supervisor"
            className="field mt-1"
          />
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Licence expiry</label>
        <input type="date" value={licenceExpiry} onChange={(e) => setLicenceExpiry(e.target.value)} className="field mt-1 w-auto" />
      </div>

      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

      <Button type="submit" variant="outline" loading={saving}>
        {saving ? "Saving…" : saved ? "Saved ✓" : "Save my licence details"}
      </Button>
    </form>
  );
}
