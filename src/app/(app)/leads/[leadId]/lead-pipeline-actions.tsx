"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Lead } from "@/types/database";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { QuoteApprovalLink } from "../quote-approval-link";

function toDateInput(d: Date) {
  return d.toISOString().slice(0, 10);
}

export function LeadPipelineActions({ lead }: { lead: Lead }) {
  const router = useRouter();
  const supabase = createClient();
  const toast = useToast();

  const [saving, setSaving] = useState(false);

  const [editingFollowUpDate, setEditingFollowUpDate] = useState(false);
  const [followUpDateInput, setFollowUpDateInput] = useState(lead.follow_up_date ?? "");

  const [quoting, setQuoting] = useState(false);
  const [quoteAmountInput, setQuoteAmountInput] = useState(lead.estimated_value?.toString() ?? "");

  const [losing, setLosing] = useState(false);
  const [lostReasonInput, setLostReasonInput] = useState("");

  async function run(update: Partial<Lead>, onDone?: () => void) {
    setSaving(true);
    const { error } = await supabase.from("leads").update(update).eq("id", lead.id);
    setSaving(false);
    if (error) {
      toast({ title: "Couldn't update lead", description: error.message, variant: "error" });
      return;
    }
    onDone?.();
    router.refresh();
  }

  async function saveFollowUpDate() {
    await run({ follow_up_date: followUpDateInput || null }, () => setEditingFollowUpDate(false));
  }

  async function startQuoting() {
    await run({ status: "quoting" });
  }

  async function confirmQuoteSent() {
    const amount = quoteAmountInput ? parseFloat(quoteAmountInput) : null;
    await run({ status: "quote_sent", quote_amount: amount, quote_sent_date: toDateInput(new Date()) }, () => {
      setQuoting(false);
    });
  }

  async function markWon() {
    await run({ status: "won" });
  }

  async function confirmLost() {
    await run({ status: "lost", lost_reason: lostReasonInput.trim() || null }, () => {
      setLosing(false);
      setLostReasonInput("");
    });
  }

  async function convertToProject() {
    setSaving(true);
    const { data: project, error: projectError } = await supabase
      .from("projects")
      .insert({
        company_id: lead.company_id,
        name: lead.client_name,
        site_address: lead.site_address,
        contract_value: lead.quote_amount ?? lead.estimated_value,
      })
      .select("id")
      .single();

    if (projectError || !project) {
      setSaving(false);
      toast({ title: "Couldn't create project", description: projectError?.message ?? "Something went wrong.", variant: "error" });
      return;
    }

    const { error: leadError } = await supabase.from("leads").update({ converted_project_id: project.id }).eq("id", lead.id);
    setSaving(false);
    if (leadError) {
      toast({ title: "Couldn't link project to lead", description: leadError.message, variant: "error" });
      return;
    }
    router.push(`/projects/${project.id}`);
  }

  return (
    <Card className="p-5">
      <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Pipeline</h2>

      {lead.status !== "won" && lead.status !== "lost" && (
        <div className="mt-3">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Next follow-up due</p>
          {!editingFollowUpDate ? (
            <button
              type="button"
              onClick={() => { setEditingFollowUpDate(true); setFollowUpDateInput(lead.follow_up_date ?? ""); }}
              className="mt-1 text-sm font-medium text-slate-900 hover:text-brand-orange hover:underline dark:text-slate-100"
            >
              {lead.follow_up_date ?? "Set a date"}
            </button>
          ) : (
            <div className="mt-1.5 flex items-center gap-2">
              <input
                type="date"
                value={followUpDateInput}
                onChange={(e) => setFollowUpDateInput(e.target.value)}
                className="field w-auto !py-1.5 text-sm"
              />
              <Button size="sm" loading={saving} onClick={saveFollowUpDate}>Save</Button>
              <button type="button" onClick={() => setEditingFollowUpDate(false)} className="text-xs text-slate-500 hover:underline dark:text-slate-400">
                Cancel
              </button>
            </div>
          )}
        </div>
      )}

      <div className="mt-4 border-t border-slate-100 pt-4 dark:border-slate-800">
        {lead.status === "enquiry" && (
          <Button size="sm" loading={saving} onClick={startQuoting}>Start quoting</Button>
        )}

        {lead.status === "quoting" && !quoting && (
          <Button size="sm" variant="outline" onClick={() => setQuoting(true)}>Mark quote sent</Button>
        )}
        {lead.status === "quoting" && quoting && (
          <div className="flex items-center gap-2">
            <input
              type="number"
              step="0.01"
              value={quoteAmountInput}
              onChange={(e) => setQuoteAmountInput(e.target.value)}
              placeholder="Quote amount (AUD)"
              className="field w-auto flex-1 !py-1.5 text-sm"
            />
            <Button size="sm" loading={saving} onClick={confirmQuoteSent}>Confirm</Button>
            <button type="button" onClick={() => setQuoting(false)} className="text-xs text-slate-500 hover:underline dark:text-slate-400">
              Cancel
            </button>
          </div>
        )}

        {lead.status === "quote_sent" && !lead.quote_accepted_at && (
          <div className="space-y-3">
            <QuoteApprovalLink token={lead.client_approval_token} />
            {!losing ? (
              <div className="flex gap-4">
                <button type="button" onClick={markWon} disabled={saving} className="text-sm font-medium text-emerald-600 hover:underline disabled:opacity-50 dark:text-emerald-400">
                  Mark won manually (phone/verbal)
                </button>
                <button type="button" onClick={() => setLosing(true)} className="text-sm text-slate-400 hover:underline">
                  Mark lost
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={lostReasonInput}
                  onChange={(e) => setLostReasonInput(e.target.value)}
                  placeholder="Reason (optional)"
                  className="field w-auto flex-1 !py-1.5 text-sm"
                />
                <Button size="sm" loading={saving} onClick={confirmLost}>Confirm lost</Button>
                <button type="button" onClick={() => setLosing(false)} className="text-xs text-slate-500 hover:underline dark:text-slate-400">
                  Cancel
                </button>
              </div>
            )}
          </div>
        )}

        {lead.status === "won" && (
          lead.converted_project_id ? (
            <a href={`/projects/${lead.converted_project_id}`} className={`text-sm font-medium text-brand-orange hover:underline`}>
              View project →
            </a>
          ) : (
            <Button size="sm" loading={saving} onClick={convertToProject}>Convert to project</Button>
          )
        )}

        {lead.status === "lost" && (
          <p className="text-sm text-slate-500 dark:text-slate-400">This lead was marked lost. No further pipeline actions.</p>
        )}
      </div>
    </Card>
  );
}
