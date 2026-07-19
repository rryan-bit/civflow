import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  const { data: profile } = await supabase.from("profiles").select("role, company_id").eq("id", user.id).single();
  if (profile?.role !== "admin" || !profile.company_id) {
    return NextResponse.json({ error: "Only a company admin can disconnect Xero." }, { status: 403 });
  }

  const admin = createAdminClient();
  const { error } = await admin.from("xero_connections").delete().eq("company_id", profile.company_id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
