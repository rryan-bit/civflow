import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default async function SiteHomePage() {
  const supabase = await createClient();
  const { data } = await supabase.rpc("get_field_worker_home");
  const projects = data?.projects ?? [];

  if (projects.length === 1) {
    redirect(`/site/${projects[0].id}`);
  }

  return (
    <div className="animate-fade-in">
      <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">Your projects</h1>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Pick a project to see the site diary, post a photo, or ask a question.</p>

      <div className="mt-6 space-y-3">
        {projects.map((p) => (
          <Link key={p.id} href={`/site/${p.id}`}>
            <Card interactive className="p-5">
              <div className="flex items-center justify-between gap-3">
                <p className="font-medium text-slate-900 dark:text-slate-100">{p.name}</p>
                <Badge tone={p.status === "active" ? "emerald" : "neutral"}>{p.status}</Badge>
              </div>
              {p.site_address && <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{p.site_address}</p>}
            </Card>
          </Link>
        ))}

        {!projects.length && (
          <p className="text-sm text-slate-500 dark:text-slate-400">
            You&apos;re not assigned to any projects yet — ask the builder to add you.
          </p>
        )}
      </div>
    </div>
  );
}
