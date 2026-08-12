import { createClient } from "@/lib/supabase/server";
import { LeadsList } from "./leads-list";
import { PageHeader } from "@/components/ui/page-header";

export default async function LeadsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase.from("profiles").select("company_id").eq("id", user!.id).single();

  const { data: leads } = await supabase.from("leads").select("*").order("created_at", { ascending: false });

  const leadIds = (leads ?? []).map((l) => l.id);
  const { data: followUps } = leadIds.length
    ? await supabase.from("lead_follow_ups").select("lead_id, created_at").in("lead_id", leadIds)
    : { data: [] as { lead_id: string; created_at: string }[] };

  const followUpCountByLead = new Map<string, number>();
  const lastFollowUpByLead = new Map<string, string>();
  for (const f of followUps ?? []) {
    followUpCountByLead.set(f.lead_id, (followUpCountByLead.get(f.lead_id) ?? 0) + 1);
    const existing = lastFollowUpByLead.get(f.lead_id);
    if (!existing || f.created_at > existing) lastFollowUpByLead.set(f.lead_id, f.created_at);
  }

  return (
    <div className="mx-auto max-w-2xl animate-fade-in">
      <PageHeader
        title="Leads & Quotes"
        subtitle="Track enquiries through to a quote, and convert a won job straight into a project."
      />

      <div className="mt-6">
        <LeadsList
          companyId={profile?.company_id ?? ""}
          leads={leads ?? []}
          followUpCountByLead={Object.fromEntries(followUpCountByLead)}
          lastFollowUpByLead={Object.fromEntries(lastFollowUpByLead)}
        />
      </div>
    </div>
  );
}
