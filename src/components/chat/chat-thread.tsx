"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";

export type ChatMessageItem = {
  id: string;
  body: string;
  createdAt: string;
  senderName: string;
  isMe: boolean;
};

function formatTime(iso: string) {
  const d = new Date(iso);
  const today = new Date();
  const sameDay = d.toDateString() === today.toDateString();
  // A fixed locale, not the runtime's default — the server and the
  // browser can disagree on locale, which formats a time differently
  // ("16:52" vs "4:52 pm") and trips a hydration mismatch.
  return sameDay
    ? d.toLocaleTimeString("en-AU", { hour: "numeric", minute: "2-digit" })
    : d.toLocaleDateString("en-AU", { month: "short", day: "numeric" }) + " " + d.toLocaleTimeString("en-AU", { hour: "numeric", minute: "2-digit" });
}

/**
 * Shared message list + composer for Team chat, Project chat, and (via a
 * thin wrapper) the subcontractor portal's read of the same project room.
 * No realtime subscription — like the rest of CivFlow, a posted message
 * shows up on refresh rather than pushing live to other open tabs.
 */
export function ChatThread({
  messages,
  onSend,
  placeholder = "Message…",
}: {
  messages: ChatMessageItem[];
  onSend: (body: string) => Promise<{ error?: string }>;
  placeholder?: string;
}) {
  const router = useRouter();
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!body.trim()) return;
    setSending(true);
    setError(null);
    const result = await onSend(body.trim());
    setSending(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    setBody("");
    router.refresh();
  }

  return (
    <div>
      <div className="h-[70vh] min-h-[28rem] space-y-3 overflow-y-auto rounded-xl border border-slate-200 p-4 dark:border-slate-800">
        {messages.length ? (
          messages.map((m) => (
            <div key={m.id} className={`flex ${m.isMe ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[80%] rounded-2xl px-3.5 py-2 text-sm ${
                m.isMe
                  ? "bg-brand-orange text-white"
                  : "bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-slate-100"
              }`}>
                {!m.isMe && <p className="mb-0.5 text-xs font-medium opacity-70">{m.senderName}</p>}
                <p className="whitespace-pre-wrap">{m.body}</p>
                <p className={`mt-1 text-[10px] ${m.isMe ? "text-white/70" : "text-slate-400 dark:text-slate-500"}`}>{formatTime(m.createdAt)}</p>
              </div>
            </div>
          ))
        ) : (
          <p className="py-6 text-center text-sm text-slate-500 dark:text-slate-400">No messages yet — say hello.</p>
        )}
      </div>

      <form onSubmit={handleSubmit} className="mt-3 flex items-end gap-2">
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSubmit(e);
            }
          }}
          rows={2}
          placeholder={placeholder}
          className="field flex-1"
        />
        <Button type="submit" size="sm" loading={sending}>Send</Button>
      </form>
      {error && <p className="mt-1.5 text-sm text-red-600 dark:text-red-400">{error}</p>}
    </div>
  );
}

/** Convenience wrapper for the normal (authenticated, table-RLS-backed) case
 * — Team chat and Project chat both just need chat_room_id + the current
 * user's id. */
export function AuthenticatedChatThread({
  roomId,
  userId,
  messages,
  placeholder,
}: {
  roomId: string;
  userId: string;
  messages: ChatMessageItem[];
  placeholder?: string;
}) {
  const supabase = createClient();

  async function onSend(body: string) {
    const { error } = await supabase.from("chat_messages").insert({
      chat_room_id: roomId,
      sender_profile_id: userId,
      body,
    });
    return { error: error?.message };
  }

  return <ChatThread messages={messages} onSend={onSend} placeholder={placeholder} />;
}
