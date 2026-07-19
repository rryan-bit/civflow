import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/card";
import { buttonStyles } from "@/components/ui/button-styles";

function formatWhen(iso: string) {
  const d = new Date(iso);
  const today = new Date();
  const sameDay = d.toDateString() === today.toDateString();
  return sameDay
    ? d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })
    : d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export default async function SiteMessagesPage() {
  const supabase = await createClient();

  const { data: home } = await supabase.rpc("get_field_worker_home");
  const assignedProjects = home?.projects ?? [];

  // Self-join every assigned project's chat room so it shows up here even
  // if this worker has never opened it before.
  await Promise.all(
    assignedProjects.map((p) => supabase.rpc("get_or_create_worker_project_chat_room", { target_project_id: p.id }))
  );

  const { data: rooms } = await supabase
    .from("chat_rooms")
    .select("id, kind, name, project_id, created_at")
    .order("created_at", { ascending: false });

  const projectName = (id: string) => assignedProjects.find((p) => p.id === id)?.name ?? "Project";

  const lastMessages = await Promise.all(
    (rooms ?? []).map((r) =>
      supabase
        .from("chat_messages")
        .select("body, created_at")
        .eq("chat_room_id", r.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle()
    )
  );

  const conversations = (rooms ?? [])
    .map((r, i) => {
      const last = lastMessages[i]?.data;
      const title = r.kind === "project" ? projectName(r.project_id!) : r.name ?? "Group chat";
      const subtitle = r.kind === "project" ? "Project chat" : r.project_id ? `Group · ${projectName(r.project_id)}` : "Group chat";
      return {
        id: r.id,
        title,
        subtitle,
        preview: last?.body ?? "No messages yet",
        when: last?.created_at ?? r.created_at,
        sortKey: last?.created_at ?? r.created_at,
      };
    })
    .sort((a, b) => b.sortKey.localeCompare(a.sortKey));

  return (
    <div className="animate-fade-in">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">Messages</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Your project chats, and any group you&apos;re part of.</p>
        </div>
        <Link href="/site/messages/new" className={buttonStyles("primary", "md")}>
          + New chat
        </Link>
      </div>

      <div className="mt-6">
        {conversations.length ? (
          <Card className="divide-y divide-slate-100 overflow-hidden p-0 dark:divide-slate-800/80">
            {conversations.map((c) => (
              <Link
                key={c.id}
                href={`/site/messages/${c.id}`}
                className="flex items-center justify-between gap-3 px-4 py-3.5 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/60"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-slate-900 dark:text-slate-100">{c.title}</p>
                  <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                    {c.subtitle} — {c.preview}
                  </p>
                </div>
                <span className="shrink-0 text-xs text-slate-400 dark:text-slate-500">{formatWhen(c.when)}</span>
              </Link>
            ))}
          </Card>
        ) : (
          <Card className="p-6 text-center text-sm text-slate-500 dark:text-slate-400">
            No conversations yet — you&apos;ll be added to your project&apos;s chat automatically once you&apos;re assigned.
          </Card>
        )}
      </div>
    </div>
  );
}
