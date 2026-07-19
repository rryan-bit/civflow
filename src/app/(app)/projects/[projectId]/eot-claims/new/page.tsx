import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { NewEotClaimForm } from "./new-eot-claim-form";
import { BackLink, PageHeader } from "@/components/ui/page-header";

export default async function NewEotClaimPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  const supabase = await createClient();

  const { data: project } = await supabase.from("projects").select("id, name").eq("id", projectId).single();
  if (!project) notFound();

  const { data: milestones } = await supabase
    .from("milestones")
    .select("id, name")
    .eq("project_id", projectId)
    .order("target_date", { ascending: true, nullsFirst: false });

  return (
    <div className="mx-auto max-w-2xl animate-fade-in">
      <BackLink href={`/projects/${projectId}/eot-claims`}>Back to EOT claims</BackLink>

      <div className="mt-3">
        <PageHeader title={`New EOT claim — ${project.name}`} subtitle="Log the delay while it's fresh — the notice clock starts from when you became aware of it, not when it started." />
      </div>

      <div className="mt-6">
        <NewEotClaimForm projectId={projectId} milestones={milestones ?? []} />
      </div>
    </div>
  );
}
