"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { UserRole } from "@/types/database";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function GenerateInviteForm() {
  const router = useRouter();
  const supabase = createClient();

  const [role, setRole] = useState<UserRole>("supervisor");
  const [projectId, setProjectId] = useState("");
  const [projects, setProjects] = useState<{ id: string; name: string }[]>([]);
  const [link, setLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (role !== "field_worker" || projects.length) return;
    supabase
      .from("projects")
      .select("id, name")
      .order("name")
      .then(({ data }) => setProjects(data ?? []));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role]);

  async function handleGenerate() {
    if (role === "field_worker" && !projectId) {
      setError("Pick which project this worker is joining.");
      return;
    }
    setLoading(true);
    setError(null);
    setLink(null);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { data: profile } = await supabase.from("profiles").select("company_id").eq("id", user!.id).single();

    if (!profile?.company_id) {
      setError("Your account has no company assigned.");
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from("invites")
      .insert({
        company_id: profile.company_id,
        role,
        project_id: role === "field_worker" ? projectId : null,
        created_by: user!.id,
      })
      .select("token")
      .single();

    setLoading(false);

    if (error || !data) {
      setError(error?.message ?? "Couldn't create the invite.");
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
    <Card className="mt-3 p-5">
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Role</label>
          <select value={role} onChange={(e) => setRole(e.target.value as UserRole)} className="field mt-1 w-auto">
            <option value="supervisor">Supervisor</option>
            <option value="project_manager">Project manager</option>
            <option value="admin">Admin</option>
            <option value="field_worker">Field worker</option>
          </select>
        </div>

        {role === "field_worker" && (
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Project</label>
            <select value={projectId} onChange={(e) => setProjectId(e.target.value)} className="field mt-1 w-auto">
              <option value="">Select a project…</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
        )}

        <Button onClick={handleGenerate} loading={loading}>
          {loading ? "Generating…" : "Generate invite link"}
        </Button>
      </div>

      {role === "field_worker" && (
        <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
          Field workers get a simplified view scoped to just this project — site diary and safety (read-only), their
          own hours, and the ability to post photos and ask questions.
        </p>
      )}

      {error && <p className="mt-2 text-sm text-red-600 dark:text-red-400">{error}</p>}

      {link && (
        <div className="mt-3 flex animate-slide-up items-center gap-2">
          <input readOnly value={link} onFocus={(e) => e.target.select()} className="field flex-1 bg-slate-50 dark:bg-slate-950" />
          <Button variant="outline" onClick={handleCopy}>
            {copied ? "Copied!" : "Copy"}
          </Button>
        </div>
      )}
      {link && <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">Expires in 7 days, and can only be used once.</p>}
    </Card>
  );
}
