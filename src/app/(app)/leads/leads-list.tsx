"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Lead, LeadStatus } from "@/types/database";
import { Card } from "@/components/ui/card";
import { Badge, BadgeTone } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { QuoteApprovalLink } from "./quote-approval-link";
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

function toDateInput(d: Date) {
  return d.toISOString().slice(0, 10);
}

function formatCurrency(n: number) {
  return n.toLocaleString(undefined, { style: "currency", currency: "AUD" });
}

export function LeadsList({ companyId, leads }: { companyId: string; leads: Lead[] }) {
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

  const [quotingId, setQuotingId] = useState<string | null>(null);
  const [quoteAmountInput, setQuoteAmountInput] = useState("");

  const [losingId, setLosingId] = useState<string | null>(null);
  const [lostReasonInput, setLostReasonInput] = useState("");

  const [editingFollowUpId, setEditingFollowUpId] = useState<string | null>(null);
  const [followUpInput, setFollowUpInput] = useState("");

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

  async function saveFollowUp(id: string) {
    setSaving(true);
    setError(null);
    const { error } = await supabase.from("leads").update({ follow_up_date: followUpInput || null }).eq("id", id);
    setSaving(false);
    if (error) {
      setError(error.message);
      return;
    }
    setEditingFollowUpId(null);
    router.refresh();
  }

  async function startQuoting(id: string) {
    setSaving(true);
    setError(null);
    const { error } = await supabase.from("leads").update({ status: "quoting" }).eq("id", id);
    setSaving(false);
    if (error) {
      setError(error.message);
      return;
    }
    router.refresh();
  }

  async function confirmQuoteSent(id: string) {
    const amount = quoteAmountInput ? parseFloat(quoteAmountInput) : null;
    setSaving(true);
    setError(null);
    const { error } = await supabase
      .from("leads")
      .update({ status: "quote_sent", quote_amount: amount, quote_sent_date: toDateInput(new Date()) })
      .eq("id", id);
    setSaving(false);
    if (error) {
      setError(error.message);
      return;
    }
    setQuotingId(null);
    setQuoteAmountInput("");
    router.refresh();
  }

  async function markWon(id: string) {
    setSaving(true);
    setError(null);
    const { error } = await supabase.from("leads").update({ status: "won" }).eq("id", id);
    setSaving(false);
    if (error) {
      setError(error.message);
      return;
    }
    router.refresh();
  }

  async function confirmLost(id: string) {
    setSaving(true);
    setError(null);
    const { error } = await supabase.from("leads").update({ status: "lost", lost_reason: lostReasonInput.trim() || null }).eq("id", id);
    setSaving(false);
    if (error) {
      setError(error.message);
      return;
    }
    setLosingId(null);
    setLostReasonInput("");
    router.refresh();
  }

  async function convertToProject(lead: Lead) {
    setSaving(true);
    setError(null);

    const { data: project, error: projectError } = await supabase
      .from("projects")
      .insert({
        company_id: companyId,
        name: lead.client_name,
        site_address: lead.site_address,
        contract_value: lead.quote_amount ?? lead.estimated_value,
      })
      .select("id")
      .single();

    if (projectError || !project) {
      setSaving(false);
      setError(projectError?.message ?? "Could not create project.");
      return;
    }

    const { error: leadError } = await supabase.from("leads").update({ converted_project_id: project.id }).eq("id", lead.id);
    setSaving(false);
    if (leadError) {
      setError(leadError.message);
      return;
    }
    router.push(`/projects/${project.id}`);
  }

  return (
    <div className="space-y-6">
      <Card className="divide-y divide-slate-100 overflow-hidden p-0 dark:divide-slate-800/80">
        {leads.map((l) => (
          <div key={l.id} className="px-4 py-3.5">
            <div className="flex items-start justify-between gap-3">
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
              </div>
              <Badge tone={statusTone[l.status]} className="shrink-0">{statusLabel[l.status]}</Badge>
            </div>

            {l.status !== "won" && l.status !== "lost" && editingFollowUpId !== l.id && (
              <button
                type="button"
                onClick={() => { setEditingFollowUpId(l.id); setFollowUpInput(l.follow_up_date ?? ""); }}
                className="mt-1.5 text-xs font-medium text-slate-500 hover:text-brand-orange hover:underline dark:text-slate-400"
              >
                {l.follow_up_date ? `Follow up ${l.follow_up_date}` : "+ Set follow-up date"}
              </button>
            )}
            {editingFollowUpId === l.id && (
              <div className="mt-1.5 flex items-center gap-2">
                <input type="date" value={followUpInput} onChange={(e) => setFollowUpInput(e.target.value)} className="field !w-auto !py-1.5 text-xs" />
                <Button size="sm" loading={saving} onClick={() => saveFollowUp(l.id)}>Save</Button>
                <button type="button" onClick={() => setEditingFollowUpId(null)} className="text-xs text-slate-500 hover:underline dark:text-slate-400">Cancel</button>
              </div>
            )}

            {l.status === "enquiry" && (
              <button type="button" onClick={() => startQuoting(l.id)} disabled={saving} className="mt-2 text-xs font-medium text-brand-orange hover:underline disabled:opacity-50">
                Start quoting
              </button>
            )}

            {l.status === "quoting" && quotingId !== l.id && (
              <button type="button" onClick={() => { setQuotingId(l.id); setQuoteAmountInput(l.estimated_value?.toString() ?? ""); }} className="mt-2 text-xs font-medium text-brand-orange hover:underline">
                Mark quote sent
              </button>
            )}
            {quotingId === l.id && (
              <div className="mt-2 flex items-center gap-2">
                <input
                  type="number"
                  step="0.01"
                  value={quoteAmountInput}
                  onChange={(e) => setQuoteAmountInput(e.target.value)}
                  placeholder="Quote amount (AUD)"
                  className="field !w-auto flex-1 !py-1.5 text-xs"
                />
                <Button size="sm" loading={saving} onClick={() => confirmQuoteSent(l.id)}>Confirm</Button>
                <button type="button" onClick={() => setQuotingId(null)} className="text-xs text-slate-500 hover:underline dark:text-slate-400">Cancel</button>
              </div>
            )}

            {l.status === "quote_sent" && !l.quote_accepted_at && (
              <QuoteApprovalLink token={l.client_approval_token} />
            )}

            {l.quote_accepted_at && (
              <p className="mt-2 text-xs text-emerald-700 dark:text-emerald-400">
                Accepted by {l.quote_accepted_name} on {new Date(l.quote_accepted_at).toLocaleDateString()}
              </p>
            )}

            {l.status === "quote_sent" && losingId !== l.id && (
              <div className="mt-2 flex gap-3">
                <button type="button" onClick={() => markWon(l.id)} disabled={saving} className="text-xs font-medium text-emerald-600 hover:underline disabled:opacity-50 dark:text-emerald-400">
                  Mark won manually (phone/verbal)
                </button>
                <button type="button" onClick={() => { setLosingId(l.id); setLostReasonInput(""); }} className="text-xs text-slate-400 hover:underline">
                  Lost
                </button>
              </div>
            )}
            {losingId === l.id && (
              <div className="mt-2 flex items-center gap-2">
                <input
                  type="text"
                  value={lostReasonInput}
                  onChange={(e) => setLostReasonInput(e.target.value)}
                  placeholder="Reason (optional)"
                  className="field !w-auto flex-1 !py-1.5 text-xs"
                />
                <Button size="sm" loading={saving} onClick={() => confirmLost(l.id)}>Confirm lost</Button>
                <button type="button" onClick={() => setLosingId(null)} className="text-xs text-slate-500 hover:underline dark:text-slate-400">Cancel</button>
              </div>
            )}

            {l.status === "won" && (
              l.converted_project_id ? (
                <a href={`/projects/${l.converted_project_id}`} className="mt-2 inline-block text-xs font-medium text-brand-orange hover:underline">
                  View project
                </a>
              ) : (
                <button type="button" onClick={() => convertToProject(l)} disabled={saving} className="mt-2 text-xs font-medium text-brand-orange hover:underline disabled:opacity-50">
                  Convert to project
                </button>
              )
            )}
          </div>
        ))}
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
