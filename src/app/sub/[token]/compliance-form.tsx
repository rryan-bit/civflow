"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";

export default function ComplianceForm({
  token,
  insuranceExpiry,
  licenceExpiry,
}: {
  token: string;
  insuranceExpiry: string | null;
  licenceExpiry: string | null;
}) {
  const router = useRouter();
  const supabase = createClient();
  const [insurance, setInsurance] = useState(insuranceExpiry ?? "");
  const [licence, setLicence] = useState(licenceExpiry ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSaved(false);

    const { error } = await supabase.rpc("update_subcontractor_compliance_by_token", {
      sub_token: token,
      new_insurance_expiry: insurance || null,
      new_licence_expiry: licence || null,
    });

    setSaving(false);
    if (error) {
      setError(error.message);
      return;
    }
    setSaved(true);
    router.refresh();
  }

  return (
    <form onSubmit={handleSave} className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
      <div>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Public liability insurance expiry</label>
        <input type="date" value={insurance} onChange={(e) => setInsurance(e.target.value)} className="field mt-1" />
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Trade licence expiry</label>
        <input type="date" value={licence} onChange={(e) => setLicence(e.target.value)} className="field mt-1" />
      </div>
      <div className="sm:col-span-2">
        {error && <p className="mb-2 text-sm text-red-600 dark:text-red-400">{error}</p>}
        {saved && !error && <p className="mb-2 text-sm text-emerald-600 dark:text-emerald-400">Saved.</p>}
        <Button type="submit" size="sm" loading={saving}>Save</Button>
      </div>
    </form>
  );
}
