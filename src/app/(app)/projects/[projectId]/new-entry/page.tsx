import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import CaptureForm from "./capture-form";
import { BackLink } from "@/components/ui/page-header";

export default async function NewEntryPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const supabase = await createClient();

  const { data: project } = await supabase
    .from("projects")
    .select("id, name")
    .eq("id", projectId)
    .single();

  if (!project) notFound();

  return (
    <div className="mx-auto max-w-md animate-fade-in">
      <BackLink href={`/projects/${projectId}`}>Back to project</BackLink>
      <h1 className="mt-3 text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">{project.name}</h1>
      <p className="text-sm text-slate-500 dark:text-slate-400">New site diary entry</p>
      <CaptureForm projectId={project.id} />
    </div>
  );
}
