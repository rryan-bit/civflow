import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { BackLink, PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { AuthenticatedChatThread, type ChatMessageItem } from "@/components/chat/chat-thread";
import { LeaveChatButton } from "../leave-chat-button";

export default async function SiteMessageRoomPage({ params }: { params: Promise<{ roomId: string }> }) {
  const { roomId } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: room } = await supabase.from("chat_rooms").select("id, kind, name, project_id").eq("id", roomId).single();
  if (!room) notFound();

  const [{ data: project }, { data: messages }, { data: participantRows }] = await Promise.all([
    room.project_id ? supabase.from("projects").select("id, name").eq("id", room.project_id).single() : Promise.resolve({ data: null }),
    supabase
      .from("chat_messages")
      .select("id, body, created_at, sender_profile_id")
      .eq("chat_room_id", roomId)
      .order("created_at", { ascending: true }),
    supabase.from("chat_participants").select("id, profile_id").eq("chat_room_id", roomId),
  ]);

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
  const profileName = (id: string) => profiles?.find((p) => p.id === id)?.full_name ?? "Someone";

  const chatMessages: ChatMessageItem[] = (messages ?? []).map((m) => ({
    id: m.id,
    body: m.body,
    createdAt: m.created_at,
    senderName: m.sender_profile_id ? profileName(m.sender_profile_id) : "Someone",
    isMe: m.sender_profile_id === user!.id,
  }));

  const participantNames = (participantRows ?? []).map((p) => (p.profile_id ? profileName(p.profile_id) : "Someone"));

  const title = room.kind === "project" ? project?.name ?? "Project chat" : room.name ?? "Group chat";
  const subtitle = room.kind === "project" ? "This project's chat — the builder and crew all see it." : project?.name ? `Group chat · ${project.name}` : "Group chat";

  return (
    <div className="animate-fade-in">
      <BackLink href="/site/messages">Back to messages</BackLink>

      <div className="mt-3">
        <PageHeader title={title} subtitle={subtitle} />
      </div>

      <div className="mt-6">
        <AuthenticatedChatThread roomId={roomId} userId={user!.id} messages={chatMessages} placeholder="Message…" />
      </div>

      <Card className="mt-6 p-5">
        <h3 className="text-sm font-medium text-slate-700 dark:text-slate-300">Who&apos;s in this chat</h3>
        {participantNames.length ? (
          <ul className="mt-2 space-y-1 text-sm text-slate-900 dark:text-slate-100">
            {participantNames.map((n, i) => (
              <li key={i}>{n}</li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Just you so far.</p>
        )}

        {room.kind === "group" && (
          <div className="mt-4 border-t border-slate-100 pt-3 dark:border-slate-800">
            <LeaveChatButton roomId={roomId} userId={user!.id} />
          </div>
        )}
      </Card>
    </div>
  );
}
