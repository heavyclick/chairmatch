import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

/**
 * GET /api/auth/verify-email?token=...
 *
 * Deliberately not auth-gated -- someone clicking this link from their
 * email inbox may not have an active browser session (different
 * device, different browser than they signed up in, etc.), so this
 * can't require createClient()'s session-based auth the way most
 * routes here do. The token itself IS the proof -- it's a random
 * 64-char hex string nobody could guess, generated server-side at
 * signup (see supabase/migrations/0022_soft_email_verification.sql).
 *
 * This never blocks or gates anything in the app -- it just records
 * that the link was clicked, then routes them somewhere useful instead
 * of always dumping them on the marketing homepage regardless of
 * whether they'd already finished onboarding: straight to their
 * dashboard if they'd already completed it, or back into onboarding if
 * not (mid-onboarding pages tolerate being re-entered fine -- they're
 * the same flow signup already sends people into). If they're not
 * actually logged in on whatever device they clicked this from,
 * middleware will bounce them to /login regardless of where this
 * points, which is the correct fallback, not something to solve here.
 */
export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token");
  if (!token) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  const supabase = createServiceClient();
  const { data: profile } = await supabase
    .from("profiles")
    .update({ email_verified_at: new Date().toISOString() })
    .eq("email_verification_token", token)
    .is("email_verified_at", null)
    .select("id, account_type")
    .maybeSingle();

  // Token already used, or invalid -- nothing to look up, just send
  // them home rather than guessing.
  if (!profile) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  const table = profile.account_type === "owner" ? "practice_profiles" : "candidate_profiles";
  const { data: onboardingProfile } = await supabase
    .from(table)
    .select("id")
    .eq("id", profile.id)
    .maybeSingle();

  const destination = onboardingProfile
    ? `/${profile.account_type}/dashboard`
    : `/onboarding/${profile.account_type}`;

  return NextResponse.redirect(new URL(destination, request.url));
}
