import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { WorkerHoursPanel } from "./worker-hours-panel";
import { BackLink, PageHeader } from "@/components/ui/page-header";

export default async function WorkerHoursPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  const supabase = await createClient();

  const { data: project } = await supabase.from("projects").select("id, name, company_id").eq("id", projectId).single();
  if (!project) notFound();

  const [{ data: workers }, { data: entries }] = await Promise.all([
    supabase.from("workers").select("*").eq("company_id", project.company_id).eq("active", true).order("name", { ascending: true }),
    supabase.from("worker_time_entries").select("*").eq("project_id", projectId).order("work_date", { ascending: false }),
  ]);

  return (
    <div className="mx-auto max-w-2xl animate-fade-in">
      <BackLink href={`/projects/${projectId}`}>Back to project</BackLink>

      <div className="mt-3">
        <PageHeader
          title={`Worker Hours — ${project.name}`}
          subtitle="Who actually worked on this project, and when — for wages and checking invoices against real hours on site."
        />
      </div>

      <div className="mt-6">
        <WorkerHoursPanel projectId={projectId} companyId={project.company_id} workers={workers ?? []} entries={entries ?? []} />
      </div>
    </div>
  );
}
