"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export type Participant = { participantId: string; profileId: string | null; name: string; kind: "staff" | "worker" | "subcontractor" };

export function ChatParticipantsPanel({
  roomId,
  currentUserId,
  participants,
  addableTeamMembers,
  addableWorkers,
  addableSubcontractors,
  canLeave,
}: {
  roomId: string;
  currentUserId: string;
  participants: Participant[];
  addableTeamMembers: { id: string; name: string }[];
  addableWorkers?: { id: string; name: string }[];
  addableSubcontractors?: { id: string; name: string }[];
  canLeave?: boolean;
}) {
  const router = useRouter();
  const supabase = createClient();

  const [removingId, setRemovingId] = useState<string | null>(null);
  const [leaving, setLeaving] = useState(false);
  const [selectedTeamMember, setSelectedTeamMember] = useState("");
  const [selectedWorker, setSelectedWorker] = useState("");
  const [selectedSubcontractor, setSelectedSubcontractor] = useState("");
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function remove(participantId: string) {
    setRemovingId(participantId);
    await supabase.from("chat_participants").delete().eq("id", participantId);
    setRemovingId(null);
    router.refresh();
  }

  async function leave() {
    setLeaving(true);
    await supabase.from("chat_participants").delete().eq("chat_room_id", roomId).eq("profile_id", currentUserId);
    setLeaving(false);
    router.push("/messages");
  }

  async function addProfile(profileId: string, reset: () => void) {
    if (!profileId) return;
    setAdding(true);
    setError(null);
    const { error } = await supabase.from("chat_participants").insert({ chat_room_id: roomId, profile_id: profileId });
    setAdding(false);
    if (error) {
      setError(error.message);
      return;
    }
    reset();
    router.refresh();
  }

  async function addSubcontractor() {
    if (!selectedSubcontractor) return;
    setAdding(true);
    setError(null);
    const { error } = await supabase.from("chat_participants").insert({ chat_room_id: roomId, subcontractor_id: selectedSubcontractor });
    setAdding(false);
    if (error) {
      setError(error.message);
      return;
    }
    setSelectedSubcontractor("");
    router.refresh();
  }

  return (
    <Card className="p-5">
      <h3 className="text-sm font-medium text-slate-700 dark:text-slate-300">Who&apos;s in this chat</h3>
      {participants.length > 0 ? (
        <ul className="mt-2 space-y-1.5">
          {participants.map((p) => (
            <li key={p.participantId} className="flex items-center justify-between gap-2 text-sm">
              <span className="flex items-center gap-1.5 text-slate-900 dark:text-slate-100">
                {p.name}
                {p.kind === "subcontractor" && <Badge tone="blue">sub</Badge>}
                {p.kind === "worker" && <Badge tone="amber">crew</Badge>}
              </span>
              <button
                type="button"
                onClick={() => remove(p.participantId)}
                disabled={removingId === p.participantId}
                className="text-xs font-medium text-slate-400 hover:text-red-600 hover:underline disabled:opacity-50 dark:hover:text-red-400"
              >
                {removingId === p.participantId ? "Removing…" : "Remove"}
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Just you so far.</p>
      )}

      {addableTeamMembers.length > 0 && (
        <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3 dark:border-slate-800">
          <select value={selectedTeamMember} onChange={(e) => setSelectedTeamMember(e.target.value)} className="field w-auto">
            <option value="">Add a team member…</option>
            {addableTeamMembers.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
          <Button
            size="sm"
            variant="outline"
            loading={adding}
            disabled={!selectedTeamMember}
            onClick={() => addProfile(selectedTeamMember, () => setSelectedTeamMember(""))}
          >
            Add
          </Button>
        </div>
      )}

      {addableWorkers && addableWorkers.length > 0 && (
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <select value={selectedWorker} onChange={(e) => setSelectedWorker(e.target.value)} className="field w-auto">
            <option value="">Add a crew member…</option>
            {addableWorkers.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name}
              </option>
            ))}
          </select>
          <Button
            size="sm"
            variant="outline"
            loading={adding}
            disabled={!selectedWorker}
            onClick={() => addProfile(selectedWorker, () => setSelectedWorker(""))}
          >
            Add
          </Button>
        </div>
      )}

      {addableSubcontractors && addableSubcontractors.length > 0 && (
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <select value={selectedSubcontractor} onChange={(e) => setSelectedSubcontractor(e.target.value)} className="field w-auto">
            <option value="">Add a subcontractor…</option>
            {addableSubcontractors.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
          <Button size="sm" variant="outline" loading={adding} disabled={!selectedSubcontractor} onClick={addSubcontractor}>
            Add
          </Button>
        </div>
      )}

      {error && <p className="mt-2 text-sm text-red-600 dark:text-red-400">{error}</p>}

      {canLeave && (
        <div className="mt-4 border-t border-slate-100 pt-3 dark:border-slate-800">
          <button
            type="button"
            onClick={leave}
            disabled={leaving}
            className="text-xs font-medium text-red-600 hover:underline disabled:opacity-50 dark:text-red-400"
          >
            {leaving ? "Leaving…" : "Leave this chat"}
          </button>
        </div>
      )}
    </Card>
  );
}
