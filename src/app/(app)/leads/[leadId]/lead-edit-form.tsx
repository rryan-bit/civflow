"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Lead } from "@/types/database";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";

export function LeadEditForm({ lead }: { lead: Lead }) {
  const router = useRouter();
  const supabase = createClient();
  const toast = useToast();

  const [editing, setEditing] = useState(false);
  const [clientName, setClientName] = useState(lead.client_name);
  const [siteAddress, setSiteAddress] = useState(lead.site_address ?? "");
  const [description, setDescription] = useState(lead.description ?? "");
  const [estimatedValue, setEstimatedValue] = useState(lead.estimated_value?.toString() ?? "");
  const [saving, setSaving] = useState(false);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!clientName.trim()) return;
    setSaving(true);

    const { error } = await supabase
      .from("leads")
      .update({
        client_name: clientName.trim(),
        site_address: siteAddress.trim() || null,
        description: description.trim() || null,
        estimated_value: estimatedValue ? parseFloat(estimatedValue) : null,
      })
      .eq("id", lead.id);

    setSaving(false);
    if (error) {
      toast({ title: "Couldn't save changes", description: error.message, variant: "error" });
      return;
    }
    setEditing(false);
    router.refresh();
  }

  if (!editing) {
    return (
      <button type="button" onClick={() => setEditing(true)} className="text-xs font-medium text-brand-orange hover:underline">
        Edit details
      </button>
    );
  }

  return (
    <form onSubmit={handleSave} className="space-y-3">
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
      <div>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Rough estimate (AUD)</label>
        <input
          type="number"
          step="0.01"
          value={estimatedValue}
          onChange={(e) => setEstimatedValue(e.target.value)}
          className="field mt-1 w-40"
        />
      </div>
      <div className="flex gap-2">
        <Button type="submit" size="sm" loading={saving}>Save</Button>
        <button type="button" onClick={() => setEditing(false)} className="text-sm text-slate-500 hover:underline dark:text-slate-400">
          Cancel
        </button>
      </div>
    </form>
  );
}
