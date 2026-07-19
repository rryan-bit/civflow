import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import EditProjectForm from "./edit-project-form";
import { BackLink } from "@/components/ui/page-header";

export default async function EditProjectPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const supabase = await createClient();

  const { data: project } = await supabase
    .from("projects")
    .select("id, name, site_address, status, client_name, client_email")
    .eq("id", projectId)
    .single();

  if (!project) notFound();

  return (
    <div className="mx-auto max-w-md animate-fade-in">
      <BackLink href={`/projects/${projectId}`}>Back to project</BackLink>
      <h1 className="mt-3 text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">Edit project</h1>
      <EditProjectForm project={project} />
    </div>
  );
}
