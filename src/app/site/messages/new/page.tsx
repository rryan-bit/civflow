import { createClient } from "@/lib/supabase/server";
import { BackLink, PageHeader } from "@/components/ui/page-header";
import { NewChatForm } from "@/components/chat/new-chat-form";

export default async function SiteNewChatPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: me } = await supabase.from("profiles").select("company_id").eq("id", user!.id).single();

  const { data: home } = await supabase.rpc("get_field_worker_home");
  const projects = (home?.projects ?? []).map((p) => ({ id: p.id, name: p.name }));
  const projectIds = projects.map((p) => p.id);

  const [{ data: staffProfiles }, { data: workerProfiles }, { data: projectWorkers }] = await Promise.all([
    me?.company_id
      ? supabase.from("profiles").select("id, full_name").eq("company_id", me.company_id).neq("role", "field_worker")
      : Promise.resolve({ data: [] as { id: string; full_name: string | null }[] }),
    me?.company_id
      ? supabase.from("profiles").select("id, full_name").eq("company_id", me.company_id).eq("role", "field_worker").neq("id", user!.id)
      : Promise.resolve({ data: [] as { id: string; full_name: string | null }[] }),
    projectIds.length ? supabase.from("project_workers").select("project_id, profile_id").in("project_id", projectIds) : Promise.resolve({ data: [] as { project_id: string; profile_id: string }[] }),
  ]);

  const workerNameById = new Map((workerProfiles ?? []).map((p) => [p.id, p.full_name ?? "Unnamed"]));
  const staff = (staffProfiles ?? []).map((p) => ({ id: p.id, name: p.full_name ?? "Unnamed", projectId: null, isWorker: false }));
  const workers = (projectWorkers ?? [])
    .filter((pw) => workerNameById.has(pw.profile_id))
    .map((pw) => ({ id: pw.profile_id, name: workerNameById.get(pw.profile_id)!, projectId: pw.project_id, isWorker: true }));

  return (
    <div className="animate-fade-in">
      <BackLink href="/site/messages">Back to messages</BackLink>

      <div className="mt-3">
        <PageHeader title="New chat" subtitle="Open your project's chat, or start a group with people on the same job." />
      </div>

      <div className="mt-6">
        <NewChatForm
          projects={projects}
          staff={staff}
          workers={workers}
          basePath="/site/messages"
          openProjectRpc="get_or_create_worker_project_chat_room"
          projectRequiredForGroup
        />
      </div>
    </div>
  );
}
