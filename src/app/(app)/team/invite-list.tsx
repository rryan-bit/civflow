"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { UserRole } from "@/types/database";
import { Card } from "@/components/ui/card";
import { Badge, BadgeTone } from "@/components/ui/badge";

type InviteRow = {
  id: string;
  token: string;
  role: UserRole;
  expires_at: string;
  used_at: string | null;
};

function statusOf(invite: InviteRow): { label: string; tone: BadgeTone } {
  if (invite.used_at) return { label: "used", tone: "emerald" };
  if (new Date(invite.expires_at) <= new Date()) return { label: "expired", tone: "neutral" };
  return { label: "pending", tone: "amber" };
}

export default function InviteList({ invites }: { invites: InviteRow[] }) {
  const router = useRouter();
  const supabase = createClient();
  const [revokingId, setRevokingId] = useState<string | null>(null);

  async function handleRevoke(id: string) {
    setRevokingId(id);
    await supabase.from("invites").delete().eq("id", id);
    setRevokingId(null);
    router.refresh();
  }

  return (
    <Card className="mt-2 divide-y divide-slate-100 overflow-hidden p-0 dark:divide-slate-800/80">
      {invites.map((invite) => {
        const status = statusOf(invite);
        return (
          <div key={invite.id} className="flex items-center justify-between px-4 py-3.5 text-sm">
            <span className="capitalize text-slate-900 dark:text-slate-100">{invite.role.replace("_", " ")}</span>
            <div className="flex items-center gap-2">
              <Badge tone={status.tone}>{status.label}</Badge>
              {status.label === "pending" && (
                <button
                  onClick={() => handleRevoke(invite.id)}
                  disabled={revokingId === invite.id}
                  className="text-xs text-red-600 underline underline-offset-2 hover:text-red-700 disabled:opacity-50 dark:text-red-400 dark:hover:text-red-300"
                >
                  Revoke
                </button>
              )}
            </div>
          </div>
        );
      })}
    </Card>
  );
}
