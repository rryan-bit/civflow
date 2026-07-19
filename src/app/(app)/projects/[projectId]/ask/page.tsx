import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AskChat } from "./ask-chat";
import { BackLink } from "@/components/ui/page-header";

export default async function AskPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  const supabase = await createClient();

  const { data: project } = await supabase.from("projects").select("id, name").eq("id", projectId).single();
  if (!project) notFound();

  return (
    <div className="mx-auto max-w-2xl animate-fade-in">
      <BackLink href={`/projects/${projectId}`}>Back to project</BackLink>
      <div className="mt-3 flex items-center gap-2">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-navy text-white dark:bg-brand-orange">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 3a9 9 0 0 0-7.5 14L3 21l4.2-1.4A9 9 0 1 0 12 3Z" />
            <path d="M9 10h.01M12 10h.01M15 10h.01" />
          </svg>
        </span>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">Ask CivFlow</h1>
      </div>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
        Ask about progress, delays, open RFIs, safety, or anything else logged on {project.name} — or tell it to log
        an RFI, variation, milestone, direction to rectify, payment claim, subcontractor, inspection, or NCR and
        it&apos;ll create it for you.
      </p>
      <div className="mt-6">
        <AskChat projectId={projectId} />
      </div>
    </div>
  );
}
