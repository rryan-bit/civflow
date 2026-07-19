import { createClient } from "@/lib/supabase/server";
import { AssetList } from "./asset-list";
import type { AssetCheckout } from "@/types/database";
import { PageHeader } from "@/components/ui/page-header";

export default async function EquipmentPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase.from("profiles").select("company_id").eq("id", user!.id).single();

  const [{ data: assets }, { data: openCheckoutsRaw }, { data: projects }] = await Promise.all([
    supabase.from("assets").select("*").order("created_at", { ascending: false }),
    supabase.from("asset_checkouts").select("*").is("returned_date", null),
    supabase.from("projects").select("id, name").eq("status", "active").order("name", { ascending: true }),
  ]);

  const openCheckouts = new Map<string, AssetCheckout>();
  for (const c of openCheckoutsRaw ?? []) {
    openCheckouts.set(c.asset_id, c);
  }

  return (
    <div className="mx-auto max-w-2xl animate-fade-in">
      <PageHeader title="Tools & Plant" subtitle="Who's got what, and when it's due back — owned tools and hired plant in one register." />

      <div className="mt-6">
        <AssetList companyId={profile?.company_id ?? ""} assets={assets ?? []} openCheckouts={openCheckouts} projects={projects ?? []} />
      </div>
    </div>
  );
}
