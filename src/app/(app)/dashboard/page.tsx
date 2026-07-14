import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import NewProjectForm from "./new-project-form";

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: projects } = await supabase
    .from("projects")
    .select("id, name, site_address, status")
    .order("created_at", { ascending: false });

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-slate-900">Projects</h1>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        {projects?.map((project) => (
          <Link
            key={project.id}
            href={`/projects/${project.id}`}
            className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm transition hover:border-slate-300 hover:shadow"
          >
            <p className="font-medium text-slate-900">{project.name}</p>
            <p className="mt-1 text-sm text-slate-500">
              {project.site_address ?? "No site address set"}
            </p>
            <span className="mt-2 inline-block rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
              {project.status}
            </span>
          </Link>
        ))}

        {!projects?.length && (
          <p className="text-sm text-slate-500">
            No projects yet — create your first one below.
          </p>
        )}
      </div>

      <div className="mt-10 max-w-sm">
        <h2 className="text-sm font-medium text-slate-700">New project</h2>
        <NewProjectForm />
      </div>
    </div>
  );
}
