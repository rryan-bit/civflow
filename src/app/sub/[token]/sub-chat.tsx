"use client";

import { createClient } from "@/lib/supabase/client";
import { ChatThread, type ChatMessageItem } from "@/components/chat/chat-thread";

export function SubcontractorChatThread({ token, messages }: { token: string; messages: ChatMessageItem[] }) {
  const supabase = createClient();

  async function onSend(body: string) {
    const { error } = await supabase.rpc("post_subcontractor_chat_message_by_token", {
      sub_token: token,
      message_body: body,
    });
    return { error: error?.message };
  }

  return <ChatThread messages={messages} onSend={onSend} placeholder="Message the builder…" />;
}
