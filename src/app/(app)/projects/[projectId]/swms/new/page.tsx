import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { NewSwmsForm } from "./new-swms-form";
import { BackLink, PageHeader } from "@/components/ui/page-header";

export default async function NewSwmsPage({
  params,
  searchParams,
}: {
  params: Promise<{ projectId: string }>;
  searchParams: Promise<{ subcontractorId?: string }>;
}) {
  const { projectId } = await params;
  const { subcontractorId } = await searchParams;
  const supabase = await createClient();

  const { data: project } = await supabase.from("projects").select("id, name").eq("id", projectId).single();
  if (!project) notFound();

  const { data: subcontractors } = await supabase
    .from("subcontractors")
    .select("id, company_name")
    .eq("project_id", projectId)
    .order("company_name", { ascending: true });

  return (
    <div className="mx-auto max-w-xl animate-fade-in">
      <BackLink href={`/projects/${projectId}/swms`}>Back to SWMS</BackLink>
      <div className="mt-3">
        <PageHeader title={`New SWMS — ${project.name}`} />
      </div>
      <div className="mt-6">
        <NewSwmsForm projectId={projectId} subcontractors={subcontractors ?? []} defaultSubcontractorId={subcontractorId ?? ""} />
      </div>
    </div>
  );
}
