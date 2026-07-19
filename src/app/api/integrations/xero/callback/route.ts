import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { exchangeXeroCode, getXeroConnections } from "@/lib/xero";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");

  const cookieStore = await cookies();
  const expectedState = cookieStore.get("xero_oauth_state")?.value;
  cookieStore.delete("xero_oauth_state");

  if (!code || !state || !expectedState || state !== expectedState) {
    return NextResponse.redirect(new URL("/compliance?xero_error=state_mismatch", request.url));
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(new URL("/login", request.url));

  const { data: profile } = await supabase.from("profiles").select("role, company_id").eq("id", user.id).single();
  if (profile?.role !== "admin" || !profile.company_id) {
    return NextResponse.redirect(new URL("/compliance?xero_error=not_admin", request.url));
  }

  try {
    const tokens = await exchangeXeroCode(code);
    const connections = await getXeroConnections(tokens.access_token);
    const tenant = connections.find((c) => c.tenantType === "ORGANISATION") ?? connections[0];
    if (!tenant) {
      return NextResponse.redirect(new URL("/compliance?xero_error=no_organisation", request.url));
    }

    const admin = createAdminClient();
    const expiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString();
    const { error } = await admin.from("xero_connections").upsert(
      {
        company_id: profile.company_id,
        tenant_id: tenant.tenantId,
        tenant_name: tenant.tenantName,
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        expires_at: expiresAt,
        connected_by: user.id,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "company_id" }
    );
    if (error) throw new Error(error.message);

    return NextResponse.redirect(new URL("/compliance?xero_connected=1", request.url));
  } catch (err) {
    console.error("Xero OAuth callback failed:", err);
    return NextResponse.redirect(new URL("/compliance?xero_error=exchange_failed", request.url));
  }
}
