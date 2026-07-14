import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

const statusColor: Record<string, string> = {
  draft: "bg-slate-100 text-slate-600",
  in_review: "bg-amber-100 text-amber-700",
  approved: "bg-emerald-100 text-emerald-700",
};

export default async function ProjectPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const supabase = await createClient();

  const { data: project } = await supabase
    .from("projects")
    .select("id, name, site_address, status")
    .eq("id", projectId)
    .single();

  if (!project) notFound();

  const { data: entries } = await supabase
    .from("diary_entries")
    .select("id, entry_date, status")
    .eq("project_id", projectId)
    .order("entry_date", { ascending: false });

  return (
    <div>
      <Link href="/dashboard" className="text-sm text-slate-500 underline underline-offset-2">
        ← All projects
      </Link>

      <div className="mt-3 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">{project.name}</h1>
          <p className="text-sm text-slate-500">{project.site_address}</p>
        </div>
        <Link
          href={`/projects/${projectId}/new-entry`}
          className="rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800"
        >
          + New site diary entry
        </Link>
      </div>

      <div className="mt-8">
        <h2 className="text-sm font-medium text-slate-700">Site diary entries</h2>
        <div className="mt-2 divide-y divide-slate-200 rounded-lg border border-slate-200 bg-white">
          {entries?.map((entry) => (
            <div key={entry.id} className="flex items-center justify-between px-4 py-3">
              <span className="text-sm text-slate-900">{entry.entry_date}</span>
              <span className={`rounded-full px-2 py-0.5 text-xs ${statusColor[entry.status]}`}>
                {entry.status.replace("_", " ")}
              </span>
            </div>
          ))}
          {!entries?.length && (
            <p className="px-4 py-6 text-sm text-slate-500">
              No entries yet. Start one from the field with the button above.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
