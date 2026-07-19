import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { MaterialsList } from "./materials-list";
import { BackLink, PageHeader } from "@/components/ui/page-header";

export default async function MaterialsPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  const supabase = await createClient();

  const { data: project } = await supabase.from("projects").select("id, name").eq("id", projectId).single();
  if (!project) notFound();

  const { data: materials } = await supabase
    .from("materials")
    .select("*")
    .eq("project_id", projectId)
    .order("expected_date", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: false });

  return (
    <div className="mx-auto max-w-2xl animate-fade-in">
      <BackLink href={`/projects/${projectId}`}>Back to project</BackLink>

      <div className="mt-3">
        <PageHeader
          title={`Materials & Deliveries — ${project.name}`}
          subtitle="What's been ordered, what's arrived, and what came up short or damaged."
        />
      </div>

      <div className="mt-6">
        <MaterialsList projectId={projectId} materials={materials ?? []} />
      </div>
    </div>
  );
}
