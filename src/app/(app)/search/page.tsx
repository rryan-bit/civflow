import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/card";
import { Badge, BadgeTone } from "@/components/ui/badge";
import { EmptyState, EmptyIcons } from "@/components/ui/empty-state";

type Result = {
  type: "Project" | "RFI" | "Variation" | "Milestone" | "Diary entry";
  title: string;
  subtitle?: string;
  href: string;
};

const typeTone: Record<Result["type"], BadgeTone> = {
  Project: "blue",
  RFI: "amber",
  Variation: "purple",
  Milestone: "emerald",
  "Diary entry": "neutral",
};

export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams;
  const query = q?.trim() ?? "";

  if (!query) {
    return (
      <div className="mx-auto max-w-2xl animate-fade-in">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">Search</h1>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Type something in the search box above to get started.</p>
      </div>
    );
  }

  const supabase = await createClient();
  const like = `%${query}%`;

  const [{ data: projects }, { data: rfis }, { data: variations }, { data: milestones }, { data: progressNotes }] =
    await Promise.all([
      supabase.from("projects").select("id, name, site_address").ilike("name", like).limit(10),
      supabase.from("rfis").select("id, project_id, subject, question").or(`subject.ilike.${like},question.ilike.${like}`).limit(10),
      supabase.from("variations").select("id, project_id, title, description").or(`title.ilike.${like},description.ilike.${like}`).limit(10),
      supabase.from("milestones").select("id, project_id, name").ilike("name", like).limit(10),
      supabase.from("progress_notes").select("diary_entry_id, summary").ilike("summary", like).limit(10),
    ]);

  const entryIds = (progressNotes ?? []).map((p) => p.diary_entry_id);
  const { data: entries } = entryIds.length
    ? await supabase.from("diary_entries").select("id, project_id, entry_date").in("id", entryIds)
    : { data: [] as { id: string; project_id: string; entry_date: string }[] };

  const results: Result[] = [
    ...(projects ?? []).map((p) => ({
      type: "Project" as const,
      title: p.name,
      subtitle: p.site_address ?? undefined,
      href: `/projects/${p.id}`,
    })),
    ...(rfis ?? []).map((r) => ({
      type: "RFI" as const,
      title: r.subject,
      subtitle: r.question,
      href: `/projects/${r.project_id}/rfis/${r.id}`,
    })),
    ...(variations ?? []).map((v) => ({
      type: "Variation" as const,
      title: v.title,
      subtitle: v.description ?? undefined,
      href: `/projects/${v.project_id}/variations/${v.id}`,
    })),
    ...(milestones ?? []).map((m) => ({
      type: "Milestone" as const,
      title: m.name,
      href: `/projects/${m.project_id}/milestones`,
    })),
    ...(progressNotes ?? []).map((p) => {
      const entry = entries?.find((e) => e.id === p.diary_entry_id);
      return {
        type: "Diary entry" as const,
        title: p.summary ?? "Untitled entry",
        subtitle: entry?.entry_date,
        href: entry ? `/projects/${entry.project_id}/entries/${entry.id}` : "/dashboard",
      };
    }),
  ];

  return (
    <div className="mx-auto max-w-2xl animate-fade-in">
      <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">
        Search results for &ldquo;{query}&rdquo;
      </h1>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
        {results.length} match{results.length === 1 ? "" : "es"}
      </p>

      <Card className="mt-6 divide-y divide-slate-100 overflow-hidden p-0 dark:divide-slate-800/80">
        {results.map((r, i) => (
          <Link key={i} href={r.href} className="flex items-center justify-between gap-3 px-4 py-3.5 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/60">
            <div className="min-w-0">
              <p className="truncate text-sm text-slate-900 dark:text-slate-100">{r.title}</p>
              {r.subtitle && <p className="truncate text-xs text-slate-500 dark:text-slate-400">{r.subtitle}</p>}
            </div>
            <Badge tone={typeTone[r.type]} className="shrink-0">{r.type}</Badge>
          </Link>
        ))}
        {!results.length && <EmptyState icon={EmptyIcons.search} title="No matches found." className="px-4 py-8" />}
      </Card>
    </div>
  );
}
