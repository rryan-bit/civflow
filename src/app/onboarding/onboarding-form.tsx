"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { CompanyType } from "@/types/database";
import { Button } from "@/components/ui/button";

const COMPANY_TYPES: { value: CompanyType; title: string; description: string }[] = [
  {
    value: "residential_builder",
    title: "Small residential builder",
    description:
      "A simplified setup for small teams — site diary, payment claims, subcontractors, and schedule, without the heavier formal compliance registers. You can turn those on anytime in settings.",
  },
  {
    value: "commercial_contractor",
    title: "Civil / commercial contractor",
    description:
      "The full toolset, including Directions to Rectify, formal ITP inspections, and non-conformance reports — for larger or more heavily regulated projects.",
  },
];

export function OnboardingForm() {
  const router = useRouter();
  const supabase = createClient();

  const [companyName, setCompanyName] = useState("");
  const [companyType, setCompanyType] = useState<CompanyType>("residential_builder");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!companyName.trim()) return;
    setSaving(true);
    setError(null);

    const { error } = await supabase.rpc("create_company", {
      company_name: companyName.trim(),
      company_type: companyType,
    });

    setSaving(false);
    if (error) {
      setError(error.message);
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="mt-6 space-y-5">
      <div>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Company name</label>
        <input
          type="text"
          required
          value={companyName}
          onChange={(e) => setCompanyName(e.target.value)}
          placeholder="e.g. Mahon Building Co."
          className="field mt-1"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">What kind of work do you do?</label>
        <div className="mt-2 space-y-2">
          {COMPANY_TYPES.map((t) => (
            <button
              key={t.value}
              type="button"
              onClick={() => setCompanyType(t.value)}
              className={`w-full rounded-xl border p-4 text-left transition-colors ${
                companyType === t.value
                  ? "border-brand-orange bg-orange-50 dark:border-brand-orange dark:bg-orange-500/10"
                  : "border-slate-200 hover:border-slate-300 dark:border-slate-800 dark:hover:border-slate-700"
              }`}
            >
              <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{t.title}</p>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{t.description}</p>
            </button>
          ))}
        </div>
        <p className="mt-2 text-xs text-slate-400 dark:text-slate-500">You can change this later in Compliance settings.</p>
      </div>

      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

      <Button type="submit" loading={saving} className="w-full">
        {saving ? "Setting up…" : "Create company"}
      </Button>

      <p className="text-center text-xs text-slate-400 dark:text-slate-500">
        Were you invited to join an existing team instead? Ask them to resend your invite link rather than creating a new company here.
      </p>
    </form>
  );
}
