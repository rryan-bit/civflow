import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import GenerateInviteForm from "./generate-invite-form";
import InviteList from "./invite-list";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default async function TeamPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: me } = await supabase.from("profiles").select("role").eq("id", user!.id).single();
  const isAdmin = me?.role === "admin";

  const [{ data: members }, { data: invites }] = await Promise.all([
    supabase.from("profiles").select("id, full_name, role").order("created_at", { ascending: true }),
    isAdmin
      ? supabase.from("invites").select("id, token, role, expires_at, used_at").order("created_at", { ascending: false })
      : Promise.resolve({ data: null }),
  ]);

  return (
    <div className="mx-auto max-w-2xl animate-fade-in">
      <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">Team</h1>

      <section className="mt-6">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Members</h2>
          <Link href="/messages" className="text-xs font-medium text-brand-orange hover:underline">
            Open Messages →
          </Link>
        </div>
        <Card className="mt-2 divide-y divide-slate-100 overflow-hidden p-0 dark:divide-slate-800/80">
          {members?.map((m) => (
            <div key={m.id} className="flex items-center justify-between px-4 py-3.5 text-sm">
              <span className="text-slate-900 dark:text-slate-100">{m.full_name ?? "Unnamed"}</span>
              <Badge>{m.role.replace("_", " ")}</Badge>
            </div>
          ))}
        </Card>
      </section>

      {isAdmin ? (
        <section className="mt-8">
          <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Invite a teammate</h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Generate a link and send it to them however you like — text, email, Slack. Anyone with the link can join
            your company at the role you pick.
          </p>
          <GenerateInviteForm />

          {invites && invites.length > 0 && (
            <div className="mt-6">
              <h3 className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">Pending &amp; past invites</h3>
              <InviteList invites={invites} />
            </div>
          )}
        </section>
      ) : (
        <p className="mt-8 text-sm text-slate-500 dark:text-slate-400">Only company admins can invite new teammates.</p>
      )}
    </div>
  );
}
