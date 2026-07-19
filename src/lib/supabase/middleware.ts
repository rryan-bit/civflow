import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Refreshes the Supabase auth session on every request and redirects
 * signed-out users away from authenticated routes. Wired up in
 * `src/middleware.ts`.
 */
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isAuthRoute = request.nextUrl.pathname.startsWith("/login");
  // /join/<token> handles both signed-in and signed-out visitors itself
  // (it shows an invite preview either way), so it's public.
  const isJoinRoute = request.nextUrl.pathname.startsWith("/join");
  // /vary/<token>, /quote/<token>, and /portal/<token> are client-facing
  // links — the client has no CivFlow account at all, so these have to be
  // public too.
  const isVaryRoute = request.nextUrl.pathname.startsWith("/vary");
  const isQuoteRoute = request.nextUrl.pathname.startsWith("/quote");
  const isPortalRoute = request.nextUrl.pathname.startsWith("/portal");
  // /sub/<token> is the same no-login pattern for subcontractors.
  const isSubRoute = request.nextUrl.pathname.startsWith("/sub");
  // /select/<token> is the same no-login pattern for client selections.
  const isSelectRoute = request.nextUrl.pathname.startsWith("/select");
  // /api/cron/* is invoked server-to-server by Vercel Cron with no browser
  // session at all — it authenticates itself via CRON_SECRET inside the
  // route instead, so it can't go through the cookie-based redirect below.
  const isCronRoute = request.nextUrl.pathname.startsWith("/api/cron");
  const isPublicAsset =
    request.nextUrl.pathname.startsWith("/_next") ||
    request.nextUrl.pathname.startsWith("/manifest") ||
    request.nextUrl.pathname.startsWith("/icons") ||
    request.nextUrl.pathname === "/favicon.ico";

  if (
    !user &&
    !isAuthRoute &&
    !isJoinRoute &&
    !isVaryRoute &&
    !isQuoteRoute &&
    !isPortalRoute &&
    !isSubRoute &&
    !isSelectRoute &&
    !isCronRoute &&
    !isPublicAsset
  ) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", request.nextUrl.pathname);
    return NextResponse.redirect(url);
  }

  if (user && isAuthRoute) {
    const next = request.nextUrl.searchParams.get("next");
    const url = request.nextUrl.clone();
    url.pathname = next && next.startsWith("/") ? next : "/dashboard";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
