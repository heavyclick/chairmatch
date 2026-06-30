import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

/**
 * Refreshes the Supabase auth session on every request so server
 * components always see a valid session. Also where route-level
 * owner-vs-candidate gating happens (e.g. a candidate hitting /owner/*
 * gets redirected, rather than relying solely on client-side checks).
 */
export async function middleware(request: NextRequest) {
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

  const { data: { user } } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  const isOwnerRoute = path.startsWith("/owner");
  const isCandidateRoute = path.startsWith("/candidate");

  // AUTH_ENFORCEMENT_ENABLED gates this redirect because there is no
  // /login page yet (see app/(auth)/login/ -- folder exists, no
  // page.tsx inside it). Without this flag, every visit to /owner/* or
  // /candidate/* bounces to a 404'ing /login in an infinite loop.
  // Once a real login page exists, set AUTH_ENFORCEMENT_ENABLED=true
  // in .env.local (or just delete this flag check) to turn real auth
  // gating back on.
  const authEnforcementEnabled = process.env.AUTH_ENFORCEMENT_ENABLED === "true";

  if (authEnforcementEnabled && !user && (isOwnerRoute || isCandidateRoute)) {
    const redirectUrl = new URL("/login", request.url);
    return NextResponse.redirect(redirectUrl);
  }

  // Owner-vs-candidate account-type gating happens here once the
  // account_type field is read from the users table (kept out of
  // middleware for now to avoid an extra DB round-trip on every
  // request -- enforce at the layout level instead, see
  // app/owner/layout.tsx and app/candidate/layout.tsx).

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
