import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { BackLink, PageHeader } from "@/components/ui/page-header";
import { NewChatForm } from "@/components/chat/new-chat-form";

export default async function NewChatPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: me } = await supabase.from("profiles").select("company_id").eq("id", user!.id).single();
  if (!me?.company_id) redirect("/onboarding");

  const [{ data: projects }, { data: staffProfiles }, { data: workerProfiles }, { data: projectWorkers }] = await Promise.all([
    supabase.from("projects").select("id, name").eq("company_id", me.company_id).order("name"),
    supabase.from("profiles").select("id, full_name").eq("company_id", me.company_id).neq("role", "field_worker").neq("id", user!.id),
    supabase.from("profiles").select("id, full_name").eq("company_id", me.company_id).eq("role", "field_worker"),
    supabase.from("project_workers").select("project_id, profile_id"),
  ]);

  const workerNameById = new Map((workerProfiles ?? []).map((p) => [p.id, p.full_name ?? "Unnamed"]));

  const staff = (staffProfiles ?? []).map((p) => ({ id: p.id, name: p.full_name ?? "Unnamed", projectId: null, isWorker: false }));
  // One entry per (worker, project) assignment — a worker on two projects
  // should be addable to a group chat scoped to either one.
  const workers = (projectWorkers ?? [])
    .filter((pw) => workerNameById.has(pw.profile_id))
    .map((pw) => ({ id: pw.profile_id, name: workerNameById.get(pw.profile_id)!, projectId: pw.project_id, isWorker: true }));

  return (
    <div className="mx-auto max-w-2xl animate-fade-in">
      <BackLink href="/messages">Back to messages</BackLink>

      <div className="mt-3">
        <PageHeader title="New chat" subtitle="Open a project's chat, or start a named group with whoever you pick." />
      </div>

      <div className="mt-6">
        <NewChatForm
          projects={projects ?? []}
          staff={staff}
          workers={workers}
          basePath="/messages"
          openProjectRpc="get_or_create_project_chat_room"
        />
      </div>
    </div>
  );
}
