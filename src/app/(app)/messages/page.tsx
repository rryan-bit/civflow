import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui/page-header";
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

export default async function MessagesPage() {
  const supabase = await createClient();

  // Make sure the company's Team chat exists so it always shows up here,
  // even for a company that's never opened it before.
  await supabase.rpc("get_or_create_team_chat_room");

  const { data: rooms } = await supabase
    .from("chat_rooms")
    .select("id, kind, name, project_id, created_at")
    .order("created_at", { ascending: false });

  const projectIds = [...new Set((rooms ?? []).map((r) => r.project_id).filter((id): id is string => Boolean(id)))];
  const { data: projects } = projectIds.length
    ? await supabase.from("projects").select("id, name").in("id", projectIds)
    : { data: [] as { id: string; name: string }[] };
  const projectName = (id: string) => projects?.find((p) => p.id === id)?.name ?? "Project";

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
      const title = r.kind === "team" ? "Team chat" : r.kind === "project" ? projectName(r.project_id!) : r.name ?? "Group chat";
      const subtitle =
        r.kind === "group" && r.project_id ? `Group · ${projectName(r.project_id)}` : r.kind === "team" ? "Everyone on staff" : r.kind === "project" ? "Project chat" : "Group chat";
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
    <div className="mx-auto max-w-2xl animate-fade-in">
      <PageHeader
        title="Messages"
        subtitle="Team chat, project chats, and any group you've started or been added to."
        actions={
          <Link href="/messages/new" className={buttonStyles("primary", "md")}>
            + New chat
          </Link>
        }
      />

      <div className="mt-6">
        {conversations.length ? (
          <Card className="divide-y divide-slate-100 overflow-hidden p-0 dark:divide-slate-800/80">
            {conversations.map((c) => (
              <Link
                key={c.id}
                href={`/messages/${c.id}`}
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
            No conversations yet. Start one from the button above, or open a project&apos;s Chat tab.
          </Card>
        )}
      </div>
    </div>
  );
}
