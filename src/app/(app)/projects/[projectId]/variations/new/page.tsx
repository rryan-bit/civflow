import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { NewVariationForm } from "./new-variation-form";
import { BackLink, PageHeader } from "@/components/ui/page-header";

export default async function NewVariationPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  const supabase = await createClient();

  const { data: project } = await supabase.from("projects").select("id, name").eq("id", projectId).single();
  if (!project) notFound();

  return (
    <div className="mx-auto max-w-xl animate-fade-in">
      <BackLink href={`/projects/${projectId}/variations`}>Back to variations</BackLink>
      <div className="mt-3">
        <PageHeader title={`New variation — ${project.name}`} />
      </div>
      <div className="mt-6">
        <NewVariationForm projectId={projectId} />
      </div>
    </div>
  );
}
