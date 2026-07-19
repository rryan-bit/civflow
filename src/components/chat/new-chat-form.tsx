"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

type Project = { id: string; name: string };
type Person = { id: string; name: string; projectId: string | null; isWorker: boolean };

export function NewChatForm({
  projects,
  staff,
  workers,
  basePath,
  openProjectRpc,
  projectRequiredForGroup,
}: {
  projects: Project[];
  staff: Person[];
  workers: Person[];
  basePath: string;
  openProjectRpc: "get_or_create_project_chat_room" | "get_or_create_worker_project_chat_room";
  projectRequiredForGroup?: boolean;
}) {
  const router = useRouter();
  const supabase = createClient();

  const [mode, setMode] = useState<"project" | "group">("project");

  const [projectId, setProjectId] = useState("");
  const [openingProject, setOpeningProject] = useState(false);
  const [projectError, setProjectError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [groupProjectId, setGroupProjectId] = useState("");
  const [selectedMembers, setSelectedMembers] = useState<Set<string>>(new Set());
  const [creating, setCreating] = useState(false);
  const [groupError, setGroupError] = useState<string | null>(null);

  const availableMembers = useMemo(() => {
    const eligibleWorkers = groupProjectId ? workers.filter((w) => w.projectId === groupProjectId) : [];
    return [...staff, ...eligibleWorkers];
  }, [staff, workers, groupProjectId]);

  function toggleMember(id: string) {
    setSelectedMembers((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function openProjectChat() {
    if (!projectId) return;
    setOpeningProject(true);
    setProjectError(null);
    const { data, error } = await supabase.rpc(openProjectRpc, { target_project_id: projectId });
    setOpeningProject(false);
    if (error || !data) {
      setProjectError(error?.message ?? "Couldn't open that chat.");
      return;
    }
    router.push(`${basePath}/${data}`);
  }

  async function createGroup() {
    if (!name.trim()) {
      setGroupError("Give the chat a name.");
      return;
    }
    if (projectRequiredForGroup && !groupProjectId) {
      setGroupError("Choose which project this chat is for.");
      return;
    }
    setCreating(true);
    setGroupError(null);
    const { data, error } = await supabase.rpc("create_group_chat", {
      chat_name: name.trim(),
      target_project_id: groupProjectId || null,
      member_profile_ids: [...selectedMembers],
    });
    setCreating(false);
    if (error || !data) {
      setGroupError(error?.message ?? "Couldn't create that chat.");
      return;
    }
    router.push(`${basePath}/${data}`);
  }

  return (
    <div>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setMode("project")}
          className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
            mode === "project" ? "bg-brand-navy text-white dark:bg-brand-orange" : "text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
          }`}
        >
          Open a project chat
        </button>
        <button
          type="button"
          onClick={() => setMode("group")}
          className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
            mode === "group" ? "bg-brand-navy text-white dark:bg-brand-orange" : "text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
          }`}
        >
          Start a group chat
        </button>
      </div>

      {mode === "project" ? (
        <Card className="mt-4 p-5">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Every project has its own chat. Pick one to open it — you&apos;ll be added automatically.
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <select value={projectId} onChange={(e) => setProjectId(e.target.value)} className="field w-auto flex-1">
              <option value="">Choose a project…</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
            <Button size="sm" loading={openingProject} disabled={!projectId} onClick={openProjectChat}>
              Open chat
            </Button>
          </div>
          {projectError && <p className="mt-2 text-sm text-red-600 dark:text-red-400">{projectError}</p>}
        </Card>
      ) : (
        <Card className="mt-4 p-5">
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
            Chat name
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Electricians, Site Team A"
              className="field mt-1"
            />
          </label>

          <label className="mt-3 block text-sm font-medium text-slate-700 dark:text-slate-300">
            {projectRequiredForGroup ? "Project" : "Project (optional — needed to add crew members)"}
            <select
              value={groupProjectId}
              onChange={(e) => {
                setGroupProjectId(e.target.value);
                setSelectedMembers(new Set());
              }}
              className="field mt-1"
            >
              <option value="">{projectRequiredForGroup ? "Choose a project…" : "No specific project"}</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>

          <div className="mt-3">
            <p className="text-sm font-medium text-slate-700 dark:text-slate-300">Add people</p>
            {availableMembers.length ? (
              <ul className="mt-2 max-h-56 space-y-1 overflow-y-auto rounded-lg border border-slate-200 p-2 dark:border-slate-800">
                {availableMembers.map((m) => (
                  <li key={m.id}>
                    <label className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-slate-50 dark:hover:bg-slate-800/60">
                      <input type="checkbox" checked={selectedMembers.has(m.id)} onChange={() => toggleMember(m.id)} />
                      <span className="text-slate-900 dark:text-slate-100">{m.name}</span>
                      {m.isWorker && <span className="text-xs text-slate-400">crew</span>}
                    </label>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">No one available to add yet.</p>
            )}
          </div>

          <Button className="mt-4" loading={creating} onClick={createGroup}>
            Create chat
          </Button>
          {groupError && <p className="mt-2 text-sm text-red-600 dark:text-red-400">{groupError}</p>}
        </Card>
      )}
    </div>
  );
}
