import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

// The project hub's "Chat" tile links here — this page's only job is to
// find-or-create the project's chat room and hand off to the real chat UI
// at /messages/[roomId], which now also has to handle Team chat and
// freeform group chats, so it's not worth a second, near-duplicate thread
// implementation living under /projects too.
export default async function ProjectChatRedirectPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  const supabase = await createClient();

  const { data: roomId, error } = await supabase.rpc("get_or_create_project_chat_room", { target_project_id: projectId });
  if (error || !roomId) notFound();

  redirect(`/messages/${roomId}`);
}
