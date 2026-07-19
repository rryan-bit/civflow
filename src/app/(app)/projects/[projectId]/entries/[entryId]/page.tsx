import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ProcessButton from "./process-button";
import ApproveButton from "./approve-button";
import DeleteEntryButton from "./delete-entry-button";
import PrintButton from "./print-button";
import PhotoCaption from "./photo-caption";
import DuplicateEntryButton from "./duplicate-entry-button";
import { BackLink } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Badge, BadgeTone } from "@/components/ui/badge";
import { PrintHeader } from "@/components/print/print-header";
import { PrintFooter } from "@/components/print/print-footer";

const statusTone: Record<string, BadgeTone> = {
  draft: "neutral",
  in_review: "amber",
  approved: "emerald",
};

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

export default async function EntryPage({
  params,
}: {
  params: Promise<{ projectId: string; entryId: string }>;
}) {
  const { projectId, entryId } = await params;
  const supabase = await createClient();

  const { data: entry } = await supabase
    .from("diary_entries")
    .select("id, entry_date, status, project_id, created_by, created_at, approved_by, approved_at")
    .eq("id", entryId)
    .single();

  if (!entry) notFound();

  const { data: project } = await supabase.from("projects").select("id, name, site_address, company_id").eq("id", projectId).single();
  const { data: company } = project?.company_id
    ? await supabase.from("companies").select("name, qbcc_licence_number, logo_storage_path").eq("id", project.company_id).single()
    : { data: null };
  const logoUrl = company?.logo_storage_path
    ? supabase.storage.from("company-logos").getPublicUrl(company.logo_storage_path).data.publicUrl
    : null;

  const [{ data: media }, { data: voiceNotes }, { data: labor }, { data: equipment }, { data: weather }, { data: safety }, { data: progress }] =
    await Promise.all([
      supabase.from("media_assets").select("id, kind, storage_path, caption").eq("diary_entry_id", entryId),
      supabase.from("voice_notes").select("id, storage_path, transcript").eq("diary_entry_id", entryId),
      supabase.from("labor_records").select("id, trade, worker_count, hours, notes").eq("diary_entry_id", entryId),
      supabase.from("equipment_records").select("id, equipment_name, hours_used, notes").eq("diary_entry_id", entryId),
      supabase.from("weather_logs").select("id, condition, temp_c, wind_kph, rainfall_mm").eq("diary_entry_id", entryId).maybeSingle(),
      supabase.from("safety_observations").select("id, severity, description, action_taken").eq("diary_entry_id", entryId),
      supabase
        .from("progress_notes")
        .select("id, summary, percent_complete, delays, missing_information, outstanding_actions")
        .eq("diary_entry_id", entryId)
        .maybeSingle(),
    ]);

  const { data: auditEntries } = await supabase
    .from("audit_log")
    .select("id, action, actor_id, created_at")
    .eq("entity_table", "diary_entries")
    .eq("entity_id", entryId)
    .order("created_at", { ascending: false })
    .limit(10);

  const auditActorIds = [...new Set((auditEntries ?? []).map((a) => a.actor_id).filter((id): id is string => Boolean(id)))];
  const { data: auditProfiles } = auditActorIds.length
    ? await supabase.from("profiles").select("id, full_name").in("id", auditActorIds)
    : { data: [] as { id: string; full_name: string | null }[] };
  const auditNameFor = (id: string | null) => (id && auditProfiles?.find((p) => p.id === id)?.full_name) || "Unknown";

  const attributionIds = [entry.created_by, entry.approved_by].filter((id): id is string => Boolean(id));
  const { data: attributionProfiles } = attributionIds.length
    ? await supabase.from("profiles").select("id, full_name").in("id", attributionIds)
    : { data: [] as { id: string; full_name: string | null }[] };
  const nameFor = (id: string | null) =>
    (id && attributionProfiles?.find((p) => p.id === id)?.full_name) || "Unknown";

  const photos = (media ?? []).filter((m) => m.kind === "photo");
  const documents = (media ?? []).filter((m) => m.kind === "document");

  const photoUrls = await Promise.all(
    photos.map(async (p) => {
      const { data } = await supabase.storage.from("diary-media").createSignedUrl(p.storage_path, 3600);
      return { id: p.id, url: data?.signedUrl, caption: p.caption };
    })
  );

  const hasExtractedData = Boolean(progress || (labor && labor.length) || (equipment && equipment.length) || weather || (safety && safety.length));

  return (
    <div className="mx-auto max-w-2xl animate-fade-in">
      <span className="print:hidden">
        <BackLink href={`/projects/${projectId}`}>Back to project</BackLink>
      </span>

      <PrintHeader
        documentTitle={`Site Diary Entry — ${entry.entry_date}`}
        companyName={company?.name}
        licenceNumber={company?.qbcc_licence_number}
        projectName={project?.name}
        siteAddress={project?.site_address}
        logoUrl={logoUrl}
      />

      <div className="mt-3 flex items-center justify-between print:mt-0">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">{entry.entry_date}</h1>
        <div className="flex items-center gap-3">
          <Badge tone={statusTone[entry.status]}>{entry.status.replace("_", " ")}</Badge>
          <span className="print:hidden">
            <DeleteEntryButton entryId={entryId} projectId={projectId} />
          </span>
        </div>
      </div>

      {/* Attribution */}
      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
        Logged by {nameFor(entry.created_by)} on {formatDateTime(entry.created_at)}
        {entry.approved_by && entry.approved_at && (
          <> · Approved by {nameFor(entry.approved_by)} on {formatDateTime(entry.approved_at)}</>
        )}
      </p>

      <div className="mt-3 flex flex-wrap gap-2 print:hidden">
        <PrintButton />
        <DuplicateEntryButton projectId={projectId} labor={labor ?? []} equipment={equipment ?? []} />
      </div>

      {/* Raw capture */}
      <section className="mt-6">
        <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Photos</h2>
        {photoUrls.length ? (
          <div className="mt-2 grid grid-cols-3 gap-2 print:grid-cols-2">
            {photoUrls.map(
              (p) =>
                p.url && (
                  <div key={p.id}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={p.url} alt={p.caption ?? "Site photo"} className="aspect-square rounded-xl object-cover print:aspect-auto" />
                    <PhotoCaption mediaId={p.id} initialCaption={p.caption} />
                  </div>
                )
            )}
          </div>
        ) : (
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">No photos attached.</p>
        )}
      </section>

      <section className="mt-6">
        <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Voice note transcript</h2>
        {voiceNotes?.length && voiceNotes[0].transcript ? (
          <Card className="mt-1.5 p-4 text-sm text-slate-900 dark:text-slate-100">{voiceNotes[0].transcript}</Card>
        ) : voiceNotes?.length ? (
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Recorded, not transcribed yet — run AI extraction to transcribe it.</p>
        ) : (
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">No voice note recorded.</p>
        )}
      </section>

      {documents.length > 0 && (
        <section className="mt-6">
          <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Documents</h2>
          <ul className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {documents.map((d) => (
              <li key={d.id}>{d.storage_path.split("/").pop()}</li>
            ))}
          </ul>
        </section>
      )}

      {/* Actions */}
      <Card className="mt-8 p-5 print:hidden">
        {entry.status === "draft" && (
          <>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              This entry hasn&apos;t been analyzed yet. Run AI extraction to draft the labor, equipment, weather,
              safety, and progress records from the photos and voice note above.
            </p>
            <div className="mt-3">
              <ProcessButton entryId={entryId} />
            </div>
          </>
        )}
        {entry.status === "in_review" && (
          <>
            <p className="text-sm text-slate-500 dark:text-slate-400">Review the AI-drafted records below, then approve the entry.</p>
            <div className="mt-3">
              <ApproveButton entryId={entryId} />
            </div>
          </>
        )}
        {entry.status === "approved" && (
          <p className="flex items-center gap-1.5 text-sm font-medium text-emerald-700 dark:text-emerald-400">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 6 9 17l-5-5" />
            </svg>
            This entry has been approved.
          </p>
        )}
      </Card>

      {/* Extracted records */}
      {hasExtractedData && (
        <section className="mt-8 space-y-4">
          <h2 className="flex items-center gap-1.5 text-sm font-semibold text-slate-700 dark:text-slate-300">
            <span className="text-brand-orange">✨</span> AI-drafted records
          </h2>

          {progress && (
            <Card className="p-5">
              <h3 className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">Progress</h3>
              <p className="mt-1.5 text-sm text-slate-900 dark:text-slate-100">{progress.summary}</p>
              {progress.percent_complete != null && (
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{progress.percent_complete}% complete (est.)</p>
              )}

              {progress.delays && progress.delays.length > 0 && (
                <div className="mt-3">
                  <h4 className="text-xs font-medium text-amber-700 dark:text-amber-400">Delays</h4>
                  <ul className="mt-1 list-inside list-disc text-sm text-slate-900 dark:text-slate-100">
                    {progress.delays.map((d, i) => (
                      <li key={i}>{d}</li>
                    ))}
                  </ul>
                </div>
              )}

              {progress.missing_information && progress.missing_information.length > 0 && (
                <div className="mt-3">
                  <h4 className="text-xs font-medium text-red-700 dark:text-red-400">Missing information</h4>
                  <ul className="mt-1 list-inside list-disc text-sm text-slate-900 dark:text-slate-100">
                    {progress.missing_information.map((m, i) => (
                      <li key={i}>{m}</li>
                    ))}
                  </ul>
                </div>
              )}

              {progress.outstanding_actions && progress.outstanding_actions.length > 0 && (
                <div className="mt-3">
                  <h4 className="text-xs font-medium text-slate-600 dark:text-slate-300">Outstanding actions</h4>
                  <ul className="mt-1 list-inside list-disc text-sm text-slate-900 dark:text-slate-100">
                    {progress.outstanding_actions.map((a, i) => (
                      <li key={i}>{a}</li>
                    ))}
                  </ul>
                </div>
              )}
            </Card>
          )}

          {labor && labor.length > 0 && (
            <Card className="p-5">
              <h3 className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">Labor</h3>
              <ul className="mt-2 divide-y divide-slate-100 text-sm dark:divide-slate-800">
                {labor.map((l) => (
                  <li key={l.id} className="py-1.5 text-slate-900 dark:text-slate-100">
                    {l.trade} — {l.worker_count} worker{l.worker_count === 1 ? "" : "s"}
                    {l.hours ? `, ${l.hours}h` : ""}
                    {l.notes && <span className="text-slate-500 dark:text-slate-400"> ({l.notes})</span>}
                  </li>
                ))}
              </ul>
            </Card>
          )}

          {equipment && equipment.length > 0 && (
            <Card className="p-5">
              <h3 className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">Equipment</h3>
              <ul className="mt-2 divide-y divide-slate-100 text-sm dark:divide-slate-800">
                {equipment.map((e) => (
                  <li key={e.id} className="py-1.5 text-slate-900 dark:text-slate-100">
                    {e.equipment_name}
                    {e.hours_used ? `, ${e.hours_used}h` : ""}
                    {e.notes && <span className="text-slate-500 dark:text-slate-400"> ({e.notes})</span>}
                  </li>
                ))}
              </ul>
            </Card>
          )}

          {weather && (
            <Card className="p-5">
              <h3 className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">Weather</h3>
              <p className="mt-1.5 text-sm text-slate-900 dark:text-slate-100">
                {[weather.condition, weather.temp_c != null ? `${weather.temp_c}°C` : null, weather.wind_kph != null ? `${weather.wind_kph} km/h wind` : null, weather.rainfall_mm != null ? `${weather.rainfall_mm}mm rain` : null]
                  .filter(Boolean)
                  .join(", ") || "No details captured."}
              </p>
            </Card>
          )}

          {safety && safety.length > 0 && (
            <Card className="p-5">
              <h3 className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">Safety observations</h3>
              <ul className="mt-2 divide-y divide-slate-100 text-sm dark:divide-slate-800">
                {safety.map((s) => (
                  <li key={s.id} className="flex items-center gap-2 py-1.5">
                    <Badge>{s.severity}</Badge>
                    <span className="text-slate-900 dark:text-slate-100">{s.description}</span>
                    {s.action_taken && <span className="text-slate-500 dark:text-slate-400"> — {s.action_taken}</span>}
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </section>
      )}

      {auditEntries && auditEntries.length > 0 && (
        <section className="mt-8 print:hidden">
          <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300">History</h2>
          <ul className="mt-2 space-y-1 text-xs text-slate-500 dark:text-slate-400">
            {auditEntries.map((a) => (
              <li key={a.id}>
                {auditNameFor(a.actor_id)} {a.action} this entry on {formatDateTime(a.created_at)}
              </li>
            ))}
          </ul>
        </section>
      )}

      <PrintFooter
        note={`Logged by ${nameFor(entry.created_by)}${entry.approved_by ? ` · Approved by ${nameFor(entry.approved_by)}` : " · Not yet approved"}`}
      />
    </div>
  );
}
