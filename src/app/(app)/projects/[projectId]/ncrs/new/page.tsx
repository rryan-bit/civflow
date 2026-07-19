import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { NewNcrForm } from "./new-ncr-form";
import { BackLink, PageHeader } from "@/components/ui/page-header";

export default async function NewNcrPage({
  params,
  searchParams,
}: {
  params: Promise<{ projectId: string }>;
  searchParams: Promise<{ inspectionId?: string }>;
}) {
  const { projectId } = await params;
  const { inspectionId } = await searchParams;
  const supabase = await createClient();

  const { data: project } = await supabase.from("projects").select("id, name").eq("id", projectId).single();
  if (!project) notFound();

  return (
    <div className="mx-auto max-w-xl animate-fade-in">
      <BackLink href={`/projects/${projectId}/ncrs`}>Back to NCRs</BackLink>
      <div className="mt-3">
        <PageHeader title={`New NCR — ${project.name}`} />
      </div>
      <div className="mt-6">
        <NewNcrForm projectId={projectId} inspectionId={inspectionId ?? ""} />
      </div>
    </div>
  );
}
