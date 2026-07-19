"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function LeaveChatButton({ roomId, userId }: { roomId: string; userId: string }) {
  const router = useRouter();
  const supabase = createClient();
  const [leaving, setLeaving] = useState(false);

  async function leave() {
    setLeaving(true);
    await supabase.from("chat_participants").delete().eq("chat_room_id", roomId).eq("profile_id", userId);
    setLeaving(false);
    router.push("/site/messages");
  }

  return (
    <button
      type="button"
      onClick={leave}
      disabled={leaving}
      className="text-xs font-medium text-red-600 hover:underline disabled:opacity-50 dark:text-red-400"
    >
      {leaving ? "Leaving…" : "Leave this chat"}
    </button>
  );
}
