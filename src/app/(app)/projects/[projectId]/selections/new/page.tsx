import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { NewSelectionForm } from "./new-selection-form";
import { BackLink, PageHeader } from "@/components/ui/page-header";

export default async function NewSelectionPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  const supabase = await createClient();

  const { data: project } = await supabase.from("projects").select("id, name").eq("id", projectId).single();
  if (!project) notFound();

  return (
    <div className="mx-auto max-w-2xl animate-fade-in">
      <BackLink href={`/projects/${projectId}/selections`}>Back to Selections</BackLink>

      <div className="mt-3">
        <PageHeader title={`New selection — ${project.name}`} subtitle="e.g. Kitchen tapware, bathroom tiles, external paint colour." />
      </div>

      <div className="mt-6">
        <NewSelectionForm projectId={projectId} />
      </div>
    </div>
  );
}
