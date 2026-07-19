import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { NewInspectionForm } from "./new-inspection-form";
import { BackLink, PageHeader } from "@/components/ui/page-header";

export default async function NewInspectionPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  const supabase = await createClient();

  const { data: project } = await supabase.from("projects").select("id, name").eq("id", projectId).single();
  if (!project) notFound();

  return (
    <div className="mx-auto max-w-xl animate-fade-in">
      <BackLink href={`/projects/${projectId}/inspections`}>Back to Inspections</BackLink>
      <div className="mt-3">
        <PageHeader title={`New Inspection — ${project.name}`} />
      </div>
      <div className="mt-6">
        <NewInspectionForm projectId={projectId} />
      </div>
    </div>
  );
}
