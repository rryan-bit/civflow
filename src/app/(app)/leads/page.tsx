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

  return (
    <div className="mx-auto max-w-2xl animate-fade-in">
      <PageHeader
        title="Leads & Quotes"
        subtitle="Track enquiries through to a quote, and convert a won job straight into a project."
      />

      <div className="mt-6">
        <LeadsList companyId={profile?.company_id ?? ""} leads={leads ?? []} />
      </div>
    </div>
  );
}
