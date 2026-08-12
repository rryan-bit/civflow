"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Lead, LeadStatus } from "@/types/database";
import { Card } from "@/components/ui/card";
import { Badge, BadgeTone } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState, EmptyIcons } from "@/components/ui/empty-state";

const statusTone: Record<LeadStatus, BadgeTone> = {
  enquiry: "neutral",
  quoting: "amber",
  quote_sent: "blue",
  won: "emerald",
  lost: "red",
};

const statusLabel: Record<LeadStatus, string> = {
  enquiry: "Enquiry",
  quoting: "Quoting",
  quote_sent: "Quote sent",
  won: "Won",
  lost: "Lost",
};

function formatCurrency(n: number) {
  return n.toLocaleString(undefined, { style: "currency", currency: "AUD" });
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString();
}

export function LeadsList({
  companyId,
  leads,
  followUpCountByLead,
  lastFollowUpByLead,
}: {
  companyId: string;
  leads: Lead[];
  followUpCountByLead: Record<string, number>;
  lastFollowUpByLead: Record<string, string>;
}) {
  const router = useRouter();
  const supabase = createClient();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [adding, setAdding] = useState(false);
  const [clientName, setClientName] = useState("");
  const [siteAddress, setSiteAddress] = useState("");
  const [description, setDescription] = useState("");
  const [estimatedValue, setEstimatedValue] = useState("");
  const [followUpDate, setFollowUpDate] = useState("");

  async function addLead(e: React.FormEvent) {
    e.preventDefault();
    if (!clientName.trim()) return;
    setSaving(true);
    setError(null);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { error } = await supabase.from("leads").insert({
      company_id: companyId,
      client_name: clientName.trim(),
      site_address: siteAddress.trim() || null,
      description: description.trim() || null,
      estimated_value: estimatedValue ? parseFloat(estimatedValue) : null,
      follow_up_date: followUpDate || null,
      created_by: user?.id ?? null,
    });

    setSaving(false);
    if (error) {
      setError(error.message);
      return;
    }
    setClientName("");
    setSiteAddress("");
    setDescription("");
    setEstimatedValue("");
    setFollowUpDate("");
    setAdding(false);
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <Card className="divide-y divide-slate-100 overflow-hidden p-0 dark:divide-slate-800/80">
        {leads.map((l) => {
          const followUpCount = followUpCountByLead[l.id] ?? 0;
          const lastFollowUp = lastFollowUpByLead[l.id];
          return (
            <Link
              key={l.id}
              href={`/leads/${l.id}`}
              className="flex items-start justify-between gap-3 px-4 py-3.5 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/60"
            >
              <div className="min-w-0">
                <p className="truncate text-sm text-slate-900 dark:text-slate-100">{l.client_name}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {l.site_address && `${l.site_address} · `}
                  {l.quote_amount !== null
                    ? `Quoted ${formatCurrency(l.quote_amount)}`
                    : l.estimated_value !== null
                      ? `Est. ${formatCurrency(l.estimated_value)}`
                      : "No estimate yet"}
                </p>
                {l.status === "lost" && l.lost_reason && (
                  <p className="mt-0.5 text-xs text-red-600 dark:text-red-400">Lost: {l.lost_reason}</p>
                )}
                {l.status !== "won" && l.status !== "lost" && (
                  <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
                    {followUpCount > 0
                      ? `Followed up ${followUpCount} time${followUpCount === 1 ? "" : "s"}${lastFollowUp ? ` · last ${formatDate(lastFollowUp)}` : ""}`
                      : "Not followed up yet"}
                    {l.follow_up_date && ` · next ${l.follow_up_date}`}
                  </p>
                )}
              </div>
              <Badge tone={statusTone[l.status]} className="shrink-0">{statusLabel[l.status]}</Badge>
            </Link>
          );
        })}
        {!leads.length && <EmptyState icon={EmptyIcons.users} title="No leads yet." className="px-4 py-8" />}
      </Card>

      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

      {adding ? (
        <Card className="p-4">
          <form onSubmit={addLead} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Client name</label>
                <input value={clientName} onChange={(e) => setClientName(e.target.value)} required className="field mt-1" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Site address</label>
                <input value={siteAddress} onChange={(e) => setSiteAddress(e.target.value)} className="field mt-1" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">What&apos;s the job?</label>
              <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} className="field mt-1" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Rough estimate (AUD, optional)</label>
                <input type="number" step="0.01" value={estimatedValue} onChange={(e) => setEstimatedValue(e.target.value)} className="field mt-1" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Follow up on</label>
                <input type="date" value={followUpDate} onChange={(e) => setFollowUpDate(e.target.value)} className="field mt-1" />
              </div>
            </div>
            <div className="flex gap-2">
              <Button type="submit" loading={saving}>Add lead</Button>
              <button type="button" onClick={() => setAdding(false)} className="text-sm text-slate-500 hover:underline dark:text-slate-400">Cancel</button>
            </div>
          </form>
        </Card>
      ) : (
        <button type="button" onClick={() => setAdding(true)} className="text-sm font-medium text-brand-orange hover:underline">
          + Add a lead
        </button>
      )}
    </div>
  );
}
