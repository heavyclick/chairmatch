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

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  const isOwnerRoute = path.startsWith("/owner");
  const isCandidateRoute = path.startsWith("/candidate");

  // AUTH_ENFORCEMENT_ENABLED must be set to "true" in Vercel env vars.
  // When true, all /owner/* and /candidate/* routes require a logged-in session.
  // Set this to "true" NOW in production — without it every protected route
  // is publicly accessible to anyone who knows the URL.
  const authEnforcementEnabled =
    process.env.AUTH_ENFORCEMENT_ENABLED === "true";

  if (authEnforcementEnabled && !user && (isOwnerRoute || isCandidateRoute)) {
    const redirectUrl = new URL("/login", request.url);
    // Preserve where they were trying to go so we can redirect back after login
    redirectUrl.searchParams.set("next", path);
    return NextResponse.redirect(redirectUrl);
  }

  // ── ?via= gate ─────────────────────────────────────────────────────────────
  // Any /jobs/* URL that contains a ?via= param (shared referral links from
  // Telegram, social media, etc.) requires the visitor to sign up or log in
  // before viewing the job.
  //
  // ?via= links are intentionally gated — they're invite/referral links
  // meant to drive signups, not public SEO traffic.
  //
  // Plain /jobs/* URLs without ?via= remain fully public (Google indexing,
  // organic search) — only the referral links are gated.
  //
  // After signup/login the user is redirected back to the original job URL
  // via the ?next= param passed to /signup.
  const isJobRoute = path.startsWith("/jobs/");
  const hasViaParam = request.nextUrl.searchParams.has("via");

  if (isJobRoute && hasViaParam && !user) {
    const redirectUrl = new URL("/signup", request.url);
    // Pass the full original URL (path + query string) as ?next=
    // so the signup page can redirect back to it after successful auth.
    redirectUrl.searchParams.set(
      "next",
      request.nextUrl.pathname + request.nextUrl.search
    );
    return NextResponse.redirect(redirectUrl);
  }

  // ── Already logged in + hits /jobs/*?via= ─────────────────────────────────
  // If they're already authenticated and click a ?via= link, let them through
  // to the public job detail page. They're already a user — no gate needed.
  // (The job detail page has its own upsell strip for non-members.)

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
