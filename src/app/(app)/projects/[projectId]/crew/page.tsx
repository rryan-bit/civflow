import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { BackLink, PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { AddWorkerPanel } from "./add-worker-panel";
import { AssignedWorkersList } from "./assigned-workers-list";
import { CrewQuestionsPanel, type CrewQuestion } from "./crew-questions-panel";

function formatDate(d: string) {
  return new Date(d).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export default async function CrewPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  const supabase = await createClient();

  const { data: project } = await supabase.from("projects").select("id, name, company_id").eq("id", projectId).single();
  if (!project) notFound();

  const [{ data: assignments }, { data: allFieldWorkers }, { data: photos }, { data: questions }] = await Promise.all([
    supabase.from("project_workers").select("id, profile_id").eq("project_id", projectId),
    project.company_id
      ? supabase.from("profiles").select("id, full_name").eq("company_id", project.company_id).eq("role", "field_worker")
      : Promise.resolve({ data: [] as { id: string; full_name: string | null }[] }),
    supabase
      .from("worker_photos")
      .select("id, storage_path, caption, created_at, uploaded_by")
      .eq("project_id", projectId)
      .order("created_at", { ascending: false })
      .limit(24),
    supabase
      .from("worker_questions")
      .select("id, question, answer, created_at, asked_by")
      .eq("project_id", projectId)
      .order("created_at", { ascending: false })
      .limit(30),
  ]);

  const assignedIds = new Set((assignments ?? []).map((a) => a.profile_id));
  const nameById = new Map((allFieldWorkers ?? []).map((w) => [w.id, w.full_name]));

  const assignedWorkers = (assignments ?? []).map((a) => ({
    assignmentId: a.id,
    profileId: a.profile_id,
    fullName: nameById.get(a.profile_id) ?? null,
  }));
  const unassignedFieldWorkers = (allFieldWorkers ?? []).filter((w) => !assignedIds.has(w.id));

  const uploaderIds = [...new Set((photos ?? []).map((p) => p.uploaded_by).concat((questions ?? []).map((q) => q.asked_by)))];
  const { data: uploaderProfiles } = uploaderIds.length
    ? await supabase.from("profiles").select("id, full_name").in("id", uploaderIds)
    : { data: [] as { id: string; full_name: string | null }[] };
  const uploaderName = (id: string) => uploaderProfiles?.find((p) => p.id === id)?.full_name ?? "A crew member";

  const photoPaths = (photos ?? []).map((p) => p.storage_path);
  const { data: signedUrls } = photoPaths.length
    ? await supabase.storage.from("diary-media").createSignedUrls(photoPaths, 3600)
    : { data: [] as { path: string | null; signedUrl: string }[] };
  const urlFor = (path: string) => signedUrls?.find((s) => s.path === path)?.signedUrl ?? null;

  const crewQuestions: CrewQuestion[] = (questions ?? []).map((q) => ({
    id: q.id,
    question: q.question,
    answer: q.answer,
    createdAt: q.created_at,
    askerName: uploaderName(q.asked_by),
  }));

  return (
    <div className="mx-auto max-w-2xl animate-fade-in">
      <BackLink href={`/projects/${projectId}`}>Back to project</BackLink>

      <div className="mt-3">
        <PageHeader title="Crew" subtitle={`Field workers on ${project.name} — site photos, questions, and who's assigned.`} />
      </div>

      <div className="mt-6">
        <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Assigned workers</h2>
        <div className="mt-2">
          <AssignedWorkersList workers={assignedWorkers} />
        </div>
      </div>

      <div className="mt-6">
        <AddWorkerPanel projectId={projectId} unassignedFieldWorkers={unassignedFieldWorkers} />
      </div>

      <div className="mt-8">
        <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Questions from the crew</h2>
        <div className="mt-2">
          <CrewQuestionsPanel questions={crewQuestions} />
        </div>
      </div>

      <div className="mt-8">
        <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Site photos</h2>
        {photos && photos.length > 0 ? (
          <div className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-4">
            {photos.map((p) => {
              const url = urlFor(p.storage_path);
              return (
                <a key={p.id} href={url ?? "#"} target="_blank" rel="noopener noreferrer" className="block overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800">
                  {url && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={url} alt={p.caption ?? "Site photo"} className="h-24 w-full object-cover" />
                  )}
                  <p className="truncate px-1.5 py-1 text-[11px] text-slate-500 dark:text-slate-400">
                    {uploaderName(p.uploaded_by)} · {formatDate(p.created_at)}
                  </p>
                </a>
              );
            })}
          </div>
        ) : (
          <Card className="mt-2 p-5">
            <p className="text-sm text-slate-500 dark:text-slate-400">No photos posted by the crew yet.</p>
          </Card>
        )}
      </div>
    </div>
  );
}
