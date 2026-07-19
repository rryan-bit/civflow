import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { BackLink, PageHeader } from "@/components/ui/page-header";
import { AuthenticatedChatThread, type ChatMessageItem } from "@/components/chat/chat-thread";
import { ChatParticipantsPanel, type Participant } from "@/components/chat/chat-participants-panel";

export default async function MessageRoomPage({ params }: { params: Promise<{ roomId: string }> }) {
  const { roomId } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: room } = await supabase.from("chat_rooms").select("id, kind, name, project_id, company_id").eq("id", roomId).single();
  if (!room) notFound();

  const { data: me } = await supabase.from("profiles").select("company_id").eq("id", user!.id).single();

  const [{ data: project }, { data: messages }, { data: participantRows }] = await Promise.all([
    room.project_id ? supabase.from("projects").select("id, name").eq("id", room.project_id).single() : Promise.resolve({ data: null }),
    supabase
      .from("chat_messages")
      .select("id, body, created_at, sender_profile_id, sender_subcontractor_id")
      .eq("chat_room_id", roomId)
      .order("created_at", { ascending: true }),
    room.kind === "team" ? Promise.resolve({ data: [] as { id: string; profile_id: string | null; subcontractor_id: string | null }[] }) : supabase.from("chat_participants").select("id, profile_id, subcontractor_id").eq("chat_room_id", roomId),
  ]);

  const [{ data: subcontractors }, { data: companyProfiles }, { data: projectWorkers }] = await Promise.all([
    room.kind === "project" && room.project_id
      ? supabase.from("subcontractors").select("id, company_name").eq("project_id", room.project_id).order("company_name")
      : Promise.resolve({ data: [] as { id: string; company_name: string }[] }),
    me?.company_id
      ? supabase.from("profiles").select("id, full_name, role").eq("company_id", me.company_id).neq("role", "field_worker")
      : Promise.resolve({ data: [] as { id: string; full_name: string | null; role: string }[] }),
    room.project_id
      ? supabase.from("project_workers").select("profile_id").eq("project_id", room.project_id)
      : Promise.resolve({ data: [] as { profile_id: string }[] }),
  ]);

  const workerProfileIds = (projectWorkers ?? []).map((w) => w.profile_id);
  const { data: workerProfiles } = workerProfileIds.length
    ? await supabase.from("profiles").select("id, full_name").in("id", workerProfileIds)
    : { data: [] as { id: string; full_name: string | null }[] };

  const profileIds = [
    ...new Set(
      [...(messages ?? []).map((m) => m.sender_profile_id), ...(participantRows ?? []).map((p) => p.profile_id)].filter(
        (id): id is string => Boolean(id)
      )
    ),
  ];
  const { data: profiles } = profileIds.length
    ? await supabase.from("profiles").select("id, full_name").in("id", profileIds)
    : { data: [] as { id: string; full_name: string | null }[] };
  const profileName = (id: string) =>
    profiles?.find((p) => p.id === id)?.full_name ?? companyProfiles?.find((p) => p.id === id)?.full_name ?? workerProfiles?.find((p) => p.id === id)?.full_name ?? "Someone";
  const subName = (id: string) => subcontractors?.find((s) => s.id === id)?.company_name ?? "A subcontractor";

  const chatMessages: ChatMessageItem[] = (messages ?? []).map((m) => ({
    id: m.id,
    body: m.body,
    createdAt: m.created_at,
    senderName: m.sender_profile_id ? profileName(m.sender_profile_id) : subName(m.sender_subcontractor_id!),
    isMe: m.sender_profile_id === user!.id,
  }));

  const workerProfileIdSet = new Set(workerProfileIds);
  const participants: Participant[] = (participantRows ?? []).map((p) => ({
    participantId: p.id,
    profileId: p.profile_id,
    name: p.profile_id ? profileName(p.profile_id) : subName(p.subcontractor_id!),
    kind: p.subcontractor_id ? "subcontractor" : p.profile_id && workerProfileIdSet.has(p.profile_id) ? "worker" : "staff",
  }));

  const participantProfileIds = new Set((participantRows ?? []).map((p) => p.profile_id).filter(Boolean));
  const participantSubIds = new Set((participantRows ?? []).map((p) => p.subcontractor_id).filter(Boolean));

  const addableTeamMembers = (companyProfiles ?? [])
    .filter((m) => !participantProfileIds.has(m.id))
    .map((m) => ({ id: m.id, name: m.full_name ?? "Unnamed" }));
  const addableWorkers = (workerProfiles ?? [])
    .filter((w) => !participantProfileIds.has(w.id))
    .map((w) => ({ id: w.id, name: w.full_name ?? "Unnamed" }));
  const addableSubcontractors = (subcontractors ?? [])
    .filter((s) => !participantSubIds.has(s.id))
    .map((s) => ({ id: s.id, name: s.company_name }));

  const title = room.kind === "team" ? "Team chat" : room.kind === "project" ? project?.name ?? "Project chat" : room.name ?? "Group chat";
  const subtitle =
    room.kind === "team"
      ? "Everyone on staff is a member automatically."
      : room.kind === "project"
        ? "This project's chat — anyone added can see it, including subcontractors via their portal link."
        : project?.name
          ? `Group chat · ${project.name}`
          : "Group chat";

  return (
    <div className="mx-auto max-w-2xl animate-fade-in">
      <BackLink href="/messages">Back to messages</BackLink>

      <div className="mt-3">
        <PageHeader title={title} subtitle={subtitle} />
      </div>

      <div className="mt-6">
        <AuthenticatedChatThread roomId={roomId} userId={user!.id} messages={chatMessages} placeholder="Message…" />
      </div>

      {room.kind !== "team" && (
        <div className="mt-6">
          <ChatParticipantsPanel
            roomId={roomId}
            currentUserId={user!.id}
            participants={participants}
            addableTeamMembers={addableTeamMembers}
            addableWorkers={addableWorkers}
            addableSubcontractors={room.kind === "project" ? addableSubcontractors : undefined}
            canLeave
          />
        </div>
      )}
    </div>
  );
}
