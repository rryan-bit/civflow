import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PhotoUploadForm } from "./photo-upload-form";
import { QuestionForm } from "./question-form";
import { LogHoursForm } from "./log-hours-form";
import { RemoveHoursButton } from "./remove-hours-button";
import { Card } from "@/components/ui/card";
import { Badge, BadgeTone } from "@/components/ui/badge";

const severityTone: Record<string, BadgeTone> = {
  info: "neutral",
  minor: "amber",
  major: "red",
  incident: "red",
};

const entryStatusTone: Record<string, BadgeTone> = {
  draft: "neutral",
  in_review: "amber",
  approved: "emerald",
};

function formatDate(d: string) {
  return new Date(d).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

export default async function SiteProjectPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  const supabase = await createClient();

  const { data } = await supabase.rpc("get_field_worker_project_data", { target_project_id: projectId });

  if (!data?.is_valid) notFound();

  const diaryEntries = data.diary_entries ?? [];
  const safetyObservations = data.safety_observations ?? [];
  const myHours = data.my_hours ?? [];

  const [{ data: photos }, { data: questions }] = await Promise.all([
    supabase
      .from("worker_photos")
      .select("id, storage_path, caption, created_at, uploaded_by")
      .eq("project_id", projectId)
      .order("created_at", { ascending: false })
      .limit(20),
    supabase
      .from("worker_questions")
      .select("id, question, answer, answered_at, created_at, asked_by")
      .eq("project_id", projectId)
      .order("created_at", { ascending: false })
      .limit(20),
  ]);

  const askerIds = [...new Set((photos ?? []).map((p) => p.uploaded_by).concat((questions ?? []).map((q) => q.asked_by)))];
  const { data: people } = askerIds.length
    ? await supabase.from("profiles").select("id, full_name").in("id", askerIds)
    : { data: [] as { id: string; full_name: string | null }[] };
  const nameFor = (id: string) => people?.find((p) => p.id === id)?.full_name ?? "A crew member";

  const photoPaths = (photos ?? []).map((p) => p.storage_path);
  const { data: signedUrls } = photoPaths.length
    ? await supabase.storage.from("diary-media").createSignedUrls(photoPaths, 3600)
    : { data: [] as { path: string | null; signedUrl: string }[] };
  const urlFor = (path: string) => signedUrls?.find((s) => s.path === path)?.signedUrl ?? null;

  return (
    <div className="animate-fade-in pb-10">
      <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">{data.project_name}</h1>
      {data.site_address && <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{data.site_address}</p>}

      <Card className="mt-6 p-5">
        <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Post a photo</h2>
        <PhotoUploadForm projectId={projectId} />
      </Card>

      {photos && photos.length > 0 && (
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
          {photos.map((p) => {
            const url = urlFor(p.storage_path);
            return (
              <a key={p.id} href={url ?? "#"} target="_blank" rel="noopener noreferrer" className="block overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800">
                {url && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={url} alt={p.caption ?? "Site photo"} className="h-28 w-full object-cover" />
                )}
                <p className="truncate px-2 py-1 text-xs text-slate-500 dark:text-slate-400">{nameFor(p.uploaded_by)}</p>
              </a>
            );
          })}
        </div>
      )}

      <Card className="mt-6 p-5">
        <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Ask a question</h2>
        <QuestionForm projectId={projectId} />
      </Card>

      {questions && questions.length > 0 && (
        <Card className="mt-3 divide-y divide-slate-100 overflow-hidden p-0 dark:divide-slate-800/80">
          {questions.map((q) => (
            <div key={q.id} className="px-4 py-3">
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {nameFor(q.asked_by)} · {formatDate(q.created_at)}
              </p>
              <p className="mt-1 text-sm text-slate-900 dark:text-slate-100">{q.question}</p>
              {q.answer ? (
                <p className="mt-1.5 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-300">
                  {q.answer}
                </p>
              ) : (
                <Badge tone="amber" className="mt-1.5">Waiting on an answer</Badge>
              )}
            </div>
          ))}
        </Card>
      )}

      <div className="mt-8">
        <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Your hours on this project</h2>
        <Card className="mt-2 p-5">
          <p className="text-2xl font-semibold text-slate-900 dark:text-slate-100">{data.my_total_hours ?? 0}h</p>
          <LogHoursForm projectId={projectId} />
          {myHours.length > 0 ? (
            <ul className="mt-4 divide-y divide-slate-100 dark:divide-slate-800">
              {myHours.map((h) => (
                <li key={h.id} className="flex items-center justify-between py-1.5 text-sm">
                  <span className="text-slate-700 dark:text-slate-300">
                    {formatDate(h.work_date)}
                    {h.notes ? ` · ${h.notes}` : ""}
                  </span>
                  <span className="flex items-center gap-3">
                    <span className="text-slate-900 dark:text-slate-100">{h.hours}h</span>
                    {h.can_remove && <RemoveHoursButton entryId={h.id} />}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">No hours logged against you yet.</p>
          )}
        </Card>
      </div>

      <div className="mt-8">
        <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Site diary</h2>
        {diaryEntries.length > 0 ? (
          <Card className="mt-2 divide-y divide-slate-100 overflow-hidden p-0 dark:divide-slate-800/80">
            {diaryEntries.map((e) => (
              <div key={e.id} className="px-4 py-3">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm text-slate-900 dark:text-slate-100">{formatDate(e.entry_date)}</span>
                  <Badge tone={entryStatusTone[e.status] ?? "neutral"}>{e.status.replace("_", " ")}</Badge>
                </div>
                {e.summary && <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{e.summary}</p>}
              </div>
            ))}
          </Card>
        ) : (
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">No diary entries logged yet.</p>
        )}
      </div>

      <div className="mt-8">
        <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Safety</h2>
        {safetyObservations.length > 0 ? (
          <Card className="mt-2 divide-y divide-slate-100 overflow-hidden p-0 dark:divide-slate-800/80">
            {safetyObservations.map((s) => (
              <div key={s.id} className="px-4 py-3">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs text-slate-500 dark:text-slate-400">{formatDate(s.entry_date)}</span>
                  <Badge tone={severityTone[s.severity] ?? "neutral"}>{s.severity}</Badge>
                </div>
                <p className="mt-1 text-sm text-slate-900 dark:text-slate-100">{s.description}</p>
                {s.action_taken && <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">Action: {s.action_taken}</p>}
              </div>
            ))}
          </Card>
        ) : (
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">No safety observations logged yet.</p>
        )}
      </div>
    </div>
  );
}
