"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export function AddWorkerPanel({
  projectId,
  unassignedFieldWorkers,
}: {
  projectId: string;
  unassignedFieldWorkers: { id: string; full_name: string | null }[];
}) {
  const router = useRouter();
  const supabase = createClient();

  const [selectedId, setSelectedId] = useState("");
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  const [generating, setGenerating] = useState(false);
  const [link, setLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);

  async function handleAddExisting() {
    if (!selectedId) return;
    setAdding(true);
    setAddError(null);
    const { error } = await supabase.from("project_workers").insert({ project_id: projectId, profile_id: selectedId });
    setAdding(false);
    if (error) {
      setAddError(error.message);
      return;
    }
    setSelectedId("");
    router.refresh();
  }

  async function handleGenerateInvite() {
    setGenerating(true);
    setInviteError(null);
    setLink(null);

    const {
      data: { user },
    } = await supabase.auth.getUser();
    const { data: profile } = await supabase.from("profiles").select("company_id").eq("id", user!.id).single();
    if (!profile?.company_id) {
      setGenerating(false);
      setInviteError("Your account has no company assigned.");
      return;
    }

    const { data, error } = await supabase
      .from("invites")
      .insert({ company_id: profile.company_id, role: "field_worker", project_id: projectId, created_by: user!.id })
      .select("token")
      .single();

    setGenerating(false);
    if (error || !data) {
      setInviteError(error?.message ?? "Couldn't create the invite.");
      return;
    }
    setLink(`${window.location.origin}/join/${data.token}`);
    router.refresh();
  }

  async function handleCopy() {
    if (!link) return;
    await navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="space-y-4">
      {unassignedFieldWorkers.length > 0 && (
        <Card className="p-5">
          <h3 className="text-sm font-medium text-slate-700 dark:text-slate-300">Add an existing worker</h3>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <select value={selectedId} onChange={(e) => setSelectedId(e.target.value)} className="field w-auto">
              <option value="">Select a worker…</option>
              {unassignedFieldWorkers.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.full_name ?? "Unnamed"}
                </option>
              ))}
            </select>
            <Button size="sm" onClick={handleAddExisting} loading={adding} disabled={!selectedId}>
              Add to project
            </Button>
          </div>
          {addError && <p className="mt-2 text-sm text-red-600 dark:text-red-400">{addError}</p>}
        </Card>
      )}

      <Card className="p-5">
        <h3 className="text-sm font-medium text-slate-700 dark:text-slate-300">Invite a new worker</h3>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          They sign up, and land straight on this project — no manual setup after that.
        </p>
        <Button size="sm" className="mt-2" onClick={handleGenerateInvite} loading={generating}>
          Generate invite link
        </Button>
        {inviteError && <p className="mt-2 text-sm text-red-600 dark:text-red-400">{inviteError}</p>}
        {link && (
          <div className="mt-3 flex items-center gap-2">
            <input readOnly value={link} onFocus={(e) => e.target.select()} className="field flex-1 bg-slate-50 dark:bg-slate-950" />
            <Button variant="outline" size="sm" onClick={handleCopy}>
              {copied ? "Copied!" : "Copy"}
            </Button>
          </div>
        )}
      </Card>
    </div>
  );
}
