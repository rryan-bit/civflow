"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type AssignableTable = "rfis" | "directions_to_rectify" | "non_conformance_reports";

/**
 * A single "Assigned to" dropdown reused across RFIs, Directions to
 * Rectify, and NCRs — the three record types that were company-wide
 * visible but had no owner. Loads the caller's own company's members
 * (not just this project's) since assignment is a team-wide concept, same
 * as the Team page's roster.
 */
export function AssigneeSelect({
  table,
  recordId,
  currentAssignee,
}: {
  table: AssignableTable;
  recordId: string;
  currentAssignee: string | null;
}) {
  const router = useRouter();
  const supabase = createClient();
  const [members, setMembers] = useState<{ id: string; full_name: string | null }[]>([]);
  const [value, setValue] = useState(currentAssignee ?? "");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      const { data: profile } = await supabase.from("profiles").select("company_id").eq("id", user.id).single();
      if (!profile?.company_id) return;
      const { data } = await supabase
        .from("profiles")
        .select("id, full_name")
        .eq("company_id", profile.company_id)
        .order("full_name", { ascending: true });
      if (!cancelled) setMembers(data ?? []);
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const newValue = e.target.value;
    setValue(newValue);
    setSaving(true);
    await supabase
      .from(table)
      .update({ assigned_to: newValue || null })
      .eq("id", recordId);
    setSaving(false);
    router.refresh();
  }

  return (
    <div>
      <label className="block text-xs font-medium text-slate-500 dark:text-slate-400">Assigned to</label>
      <select value={value} onChange={handleChange} disabled={saving} className="field mt-1 !w-auto !py-1.5 text-sm">
        <option value="">Unassigned</option>
        {members.map((m) => (
          <option key={m.id} value={m.id}>
            {m.full_name ?? "Unnamed"}
          </option>
        ))}
      </select>
    </div>
  );
}
