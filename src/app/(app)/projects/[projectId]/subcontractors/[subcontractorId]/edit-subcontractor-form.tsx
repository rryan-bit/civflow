"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Subcontractor } from "@/types/database";
import { Button } from "@/components/ui/button";

export function EditSubcontractorForm({ subcontractor }: { subcontractor: Subcontractor }) {
  const router = useRouter();
  const supabase = createClient();

  const [trade, setTrade] = useState(subcontractor.trade ?? "");
  const [contactName, setContactName] = useState(subcontractor.contact_name ?? "");
  const [contactPhone, setContactPhone] = useState(subcontractor.contact_phone ?? "");
  const [contactEmail, setContactEmail] = useState(subcontractor.contact_email ?? "");
  const [licenceNumber, setLicenceNumber] = useState(subcontractor.qbcc_licence_number ?? "");
  const [licenceExpiry, setLicenceExpiry] = useState(subcontractor.licence_expiry ?? "");
  const [insuranceExpiry, setInsuranceExpiry] = useState(subcontractor.insurance_expiry ?? "");
  const [notes, setNotes] = useState(subcontractor.notes ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const { error } = await supabase
      .from("subcontractors")
      .update({
        trade: trade.trim() || null,
        contact_name: contactName.trim() || null,
        contact_phone: contactPhone.trim() || null,
        contact_email: contactEmail.trim() || null,
        qbcc_licence_number: licenceNumber.trim() || null,
        licence_expiry: licenceExpiry || null,
        insurance_expiry: insuranceExpiry || null,
        notes: notes.trim() || null,
      })
      .eq("id", subcontractor.id);

    setSaving(false);

    if (error) {
      setError(error.message);
      return;
    }

    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="mt-3 space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Trade</label>
          <input type="text" value={trade} onChange={(e) => setTrade(e.target.value)} className="field mt-1" />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Contact name</label>
          <input type="text" value={contactName} onChange={(e) => setContactName(e.target.value)} className="field mt-1" />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Phone</label>
          <input type="text" value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} className="field mt-1" />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Email</label>
        <input type="email" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} className="field mt-1" />
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
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Notes</label>
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} className="field mt-1" />
      </div>

      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

      <Button type="submit" loading={saving}>
        {saving ? "Saving…" : "Save changes"}
      </Button>
    </form>
  );
}
