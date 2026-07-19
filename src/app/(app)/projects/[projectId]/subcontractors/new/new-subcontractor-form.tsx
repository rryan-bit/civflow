"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export function NewSubcontractorForm({ projectId }: { projectId: string }) {
  const router = useRouter();
  const supabase = createClient();

  const [companyName, setCompanyName] = useState("");
  const [trade, setTrade] = useState("");
  const [contactName, setContactName] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [licenceNumber, setLicenceNumber] = useState("");
  const [licenceExpiry, setLicenceExpiry] = useState("");
  const [insuranceExpiry, setInsuranceExpiry] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!companyName.trim()) return;
    setSaving(true);
    setError(null);

    const { data, error } = await supabase
      .from("subcontractors")
      .insert({
        project_id: projectId,
        company_name: companyName.trim(),
        trade: trade.trim() || null,
        contact_name: contactName.trim() || null,
        contact_phone: contactPhone.trim() || null,
        contact_email: contactEmail.trim() || null,
        qbcc_licence_number: licenceNumber.trim() || null,
        licence_expiry: licenceExpiry || null,
        insurance_expiry: insuranceExpiry || null,
        notes: notes.trim() || null,
      })
      .select("id")
      .single();

    setSaving(false);

    if (error || !data) {
      setError(error?.message ?? "Couldn't add the subcontractor.");
      return;
    }

    router.push(`/projects/${projectId}/subcontractors/${data.id}`);
    router.refresh();
  }

  return (
    <Card className="p-5">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Company name</label>
            <input type="text" value={companyName} onChange={(e) => setCompanyName(e.target.value)} required className="field mt-1" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Trade</label>
            <input type="text" value={trade} onChange={(e) => setTrade(e.target.value)} placeholder="e.g. Electrical" className="field mt-1" />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Contact name</label>
            <input type="text" value={contactName} onChange={(e) => setContactName(e.target.value)} className="field mt-1" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Phone</label>
            <input type="text" value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} className="field mt-1" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Email</label>
            <input type="email" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} className="field mt-1" />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">QBCC licence number</label>
          <input type="text" value={licenceNumber} onChange={(e) => setLicenceNumber(e.target.value)} className="field mt-1" />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Licence expiry</label>
            <input type="date" value={licenceExpiry} onChange={(e) => setLicenceExpiry(e.target.value)} className="field mt-1" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Insurance expiry</label>
            <input type="date" value={insuranceExpiry} onChange={(e) => setInsuranceExpiry(e.target.value)} className="field mt-1" />
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Public liability certificate of currency.</p>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Notes (optional)</label>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} className="field mt-1" />
        </div>

        {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

        <Button type="submit" loading={saving}>
          {saving ? "Adding…" : "Add Subcontractor"}
        </Button>
      </form>
    </Card>
  );
}
