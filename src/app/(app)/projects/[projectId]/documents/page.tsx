import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DocumentsPanel } from "./documents-panel";
import { BackLink, PageHeader } from "@/components/ui/page-header";

export default async function DocumentsPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  const supabase = await createClient();

  const { data: project } = await supabase.from("projects").select("id, name").eq("id", projectId).single();
  if (!project) notFound();

  const { data: documents } = await supabase
    .from("documents")
    .select("*")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false });

  return (
    <div className="mx-auto max-w-2xl animate-fade-in">
      <BackLink href={`/projects/${projectId}`}>Back to project</BackLink>

      <div className="mt-3">
        <PageHeader
          title={`Documents — ${project.name}`}
          subtitle="Contracts, insurance, plans, and permits — all in one place instead of buried in diary entries. Mark a document “Share with client” to make it visible on the project portal."
        />
      </div>

      <div className="mt-6">
        <DocumentsPanel projectId={projectId} documents={documents ?? []} />
      </div>
    </div>
  );
}
