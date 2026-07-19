"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Project, ProjectStatus } from "@/types/database";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function EditProjectForm({
  project,
}: {
  project: Pick<Project, "id" | "name" | "site_address" | "status" | "client_name" | "client_email">;
}) {
  const router = useRouter();
  const supabase = createClient();

  const [name, setName] = useState(project.name);
  const [siteAddress, setSiteAddress] = useState(project.site_address ?? "");
  const [status, setStatus] = useState<ProjectStatus>(project.status);
  const [clientName, setClientName] = useState(project.client_name ?? "");
  const [clientEmail, setClientEmail] = useState(project.client_email ?? "");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError("Project name can't be empty.");
      return;
    }

    setSaving(true);
    const { error } = await supabase
      .from("projects")
      .update({
        name: name.trim(),
        site_address: siteAddress.trim() || null,
        status,
        client_name: clientName.trim() || null,
        client_email: clientEmail.trim() || null,
      })
      .eq("id", project.id);
    setSaving(false);

    if (error) {
      setError(error.message);
      return;
    }

    router.push(`/projects/${project.id}`);
    router.refresh();
  }

  async function handleDelete() {
    const confirmed = window.confirm(
      `Delete "${project.name}"? This permanently deletes all its diary entries, photos, and records. This can't be undone.`
    );
    if (!confirmed) return;

    setDeleting(true);
    const { error } = await supabase.from("projects").delete().eq("id", project.id);
    setDeleting(false);

    if (error) {
      setError(error.message);
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div className="mt-6 space-y-6">
      <Card className="p-5">
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Project name</label>
            <input type="text" required value={name} onChange={(e) => setName(e.target.value)} className="field mt-1" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Site address</label>
            <input type="text" value={siteAddress} onChange={(e) => setSiteAddress(e.target.value)} className="field mt-1" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Status</label>
            <select value={status} onChange={(e) => setStatus(e.target.value as ProjectStatus)} className="field mt-1">
              <option value="active">Active</option>
              <option value="archived">Archived</option>
            </select>
          </div>
          <div className="border-t border-slate-100 pt-4 dark:border-slate-800">
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Client name</label>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">Needed to push payment claims to Xero as invoices.</p>
            <input type="text" value={clientName} onChange={(e) => setClientName(e.target.value)} className="field mt-1" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Client email</label>
            <input type="email" value={clientEmail} onChange={(e) => setClientEmail(e.target.value)} className="field mt-1" />
          </div>

          {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

          <Button type="submit" loading={saving} className="w-full">
            {saving ? "Saving…" : "Save changes"}
          </Button>
        </form>
      </Card>

      <Card className="border-red-200/70 bg-red-50/60 p-5 dark:border-red-900/50 dark:bg-red-950/20">
        <h2 className="text-sm font-semibold text-red-900 dark:text-red-300">Danger zone</h2>
        <p className="mt-1 text-sm text-red-800/90 dark:text-red-300/90">
          Deleting a project removes every diary entry, photo, and record attached to it. This can&apos;t be undone.
        </p>
        <Button
          type="button"
          variant="outline"
          onClick={handleDelete}
          loading={deleting}
          className="mt-3 !border-red-300 !bg-white !text-red-700 hover:!bg-red-100 dark:!border-red-800 dark:!bg-slate-900 dark:!text-red-400 dark:hover:!bg-red-900/40"
        >
          {deleting ? "Deleting…" : "Delete project"}
        </Button>
      </Card>
    </div>
  );
}
