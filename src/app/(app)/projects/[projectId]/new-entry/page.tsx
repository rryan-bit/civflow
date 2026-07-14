import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import CaptureForm from "./capture-form";

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
    <div className="mx-auto max-w-md">
      <h1 className="text-xl font-semibold text-slate-900">{project.name}</h1>
      <p className="text-sm text-slate-500">New site diary entry</p>
      <CaptureForm projectId={project.id} />
    </div>
  );
}
