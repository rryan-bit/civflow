import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { getXeroAuthorizeUrl, isXeroConfigured } from "@/lib/xero";

// Kicks off the OAuth2 handshake — admin-only, since this is what lets a
// Xero organisation start receiving invoices on the company's behalf.
// State is a random token stashed in a short-lived httpOnly cookie and
// checked again in the callback, standard OAuth CSRF protection.

export async function GET(request: Request) {
  if (!isXeroConfigured()) {
    return NextResponse.json(
      { error: "Xero isn't configured on this server yet — set XERO_CLIENT_ID, XERO_CLIENT_SECRET, and XERO_REDIRECT_URI." },
      { status: 400 }
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(new URL("/login", request.url));

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") {
    return NextResponse.redirect(new URL("/compliance?xero_error=not_admin", request.url));
  }

  const state = crypto.randomUUID();
  const cookieStore = await cookies();
  cookieStore.set("xero_oauth_state", state, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    maxAge: 600,
    path: "/",
  });

  return NextResponse.redirect(getXeroAuthorizeUrl(state));
}
