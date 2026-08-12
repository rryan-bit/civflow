"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { CompanyType } from "@/types/database";

const COMPANY_TYPES: { value: CompanyType; title: string; description: string }[] = [
  {
    value: "residential_builder",
    title: "Small residential builder",
    description: "Hides Directions to Rectify, formal ITP inspections, and NCRs from project pages by default.",
  },
  {
    value: "commercial_contractor",
    title: "Civil / commercial contractor",
    description: "Shows the full toolset on every project, including the formal compliance registers.",
  },
];

export function CompanyTypeForm({ companyId, companyType }: { companyId: string; companyType: CompanyType }) {
  const router = useRouter();
  const supabase = createClient();
  const [saving, setSaving] = useState<CompanyType | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleChange(value: CompanyType) {
    if (value === companyType) return;
    setSaving(value);
    setError(null);
    const { error } = await supabase.from("companies").update({ company_type: value }).eq("id", companyId);
    setSaving(null);
    if (error) {
      setError(error.message);
      return;
    }
    router.refresh();
  }

  return (
    <div className="mt-3 space-y-2">
      {COMPANY_TYPES.map((t) => (
        <button
          key={t.value}
          type="button"
          onClick={() => handleChange(t.value)}
          disabled={saving !== null}
          className={`w-full rounded-xl border p-3.5 text-left transition-colors disabled:opacity-60 ${
            companyType === t.value
              ? "border-brand-orange bg-orange-50 dark:border-brand-orange dark:bg-orange-500/10"
              : "border-slate-200 hover:border-slate-300 dark:border-slate-800 dark:hover:border-slate-700"
          }`}
        >
          <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
            {t.title} {saving === t.value && <span className="font-normal text-slate-400">saving…</span>}
          </p>
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{t.description}</p>
        </button>
      ))}
      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
    </div>
  );
}
