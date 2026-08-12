"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { MfrCategory } from "@/types/database";
import { Button } from "@/components/ui/button";

type CompanyFields = {
  id: string;
  qbcc_licence_number: string | null;
  qbcc_licence_class: string | null;
  qbcc_licence_expiry: string | null;
  mfr_category: MfrCategory | null;
  mfr_report_due_date: string | null;
} | null;

const MFR_CATEGORIES: MfrCategory[] = ["SC1", "SC2", "CAT1", "CAT2", "CAT3", "CAT4", "CAT5", "CAT6", "CAT7"];

function toDateInput(d: Date) {
  return d.toISOString().slice(0, 10);
}

// SC1/SC2 lodge 1 Nov–31 Mar; Categories 1–7 lodge 1 Aug–31 Dec. Suggests
// the next upcoming due date for whichever window is currently open or
// next, so a builder doesn't have to work the calendar out by hand.
function suggestMfrDueDate(category: MfrCategory | ""): string {
  const now = new Date();
  const year = now.getFullYear();
  if (category === "SC1" || category === "SC2") {
    // Window: 1 Nov–31 Mar. If we're past 31 Mar this year, the next due
    // date is 31 Mar next year; otherwise it's 31 Mar this year.
    const marchThisYear = new Date(year, 2, 31);
    return toDateInput(now <= marchThisYear ? marchThisYear : new Date(year + 1, 2, 31));
  }
  // Categories 1-7 window: 1 Aug–31 Dec.
  const decThisYear = new Date(year, 11, 31);
  return toDateInput(now <= decThisYear ? decThisYear : new Date(year + 1, 11, 31));
}

export function CompanyLicenceForm({ company }: { company: CompanyFields }) {
  const router = useRouter();
  const supabase = createClient();

  const [licenceNumber, setLicenceNumber] = useState(company?.qbcc_licence_number ?? "");
  const [licenceClass, setLicenceClass] = useState(company?.qbcc_licence_class ?? "");
  const [licenceExpiry, setLicenceExpiry] = useState(company?.qbcc_licence_expiry ?? "");
  const [mfrCategory, setMfrCategory] = useState<MfrCategory | "">(company?.mfr_category ?? "");
  const [mfrDueDate, setMfrDueDate] = useState(company?.mfr_report_due_date ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!company) return;
    setSaving(true);
    setError(null);
    setSaved(false);

    const { error } = await supabase
      .from("companies")
      .update({
        qbcc_licence_number: licenceNumber.trim() || null,
        qbcc_licence_class: licenceClass.trim() || null,
        qbcc_licence_expiry: licenceExpiry || null,
        mfr_category: mfrCategory || null,
        mfr_report_due_date: mfrDueDate || null,
      })
      .eq("id", company.id);

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
            placeholder="e.g. Builder—Project Management Services"
            className="field mt-1"
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Licence expiry</label>
          <input type="date" value={licenceExpiry} onChange={(e) => setLicenceExpiry(e.target.value)} className="field mt-1" />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">MFR category</label>
          <select value={mfrCategory} onChange={(e) => setMfrCategory(e.target.value as MfrCategory | "")} className="field mt-1">
            <option value="">Not set</option>
            {MFR_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">MFR annual report due date</label>
        <div className="mt-1 flex items-center gap-2">
          <input type="date" value={mfrDueDate} onChange={(e) => setMfrDueDate(e.target.value)} className="field w-auto" />
          {mfrCategory && (
            <button
              type="button"
              onClick={() => setMfrDueDate(suggestMfrDueDate(mfrCategory))}
              className="text-xs font-medium text-brand-orange hover:underline"
            >
              Suggest from category
            </button>
          )}
        </div>
      </div>

      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

      <Button type="submit" loading={saving}>
        {saving ? "Saving…" : saved ? "Saved ✓" : "Save details"}
      </Button>
    </form>
  );
}
