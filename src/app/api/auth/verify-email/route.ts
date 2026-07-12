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
 * This never blocks or gates anything in the app today -- it just
 * records that the link was clicked. Redirects to the homepage with a
 * query param the frontend could show a toast for, if that's ever
 * wanted; not required.
 */
export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token");
  if (!token) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  const supabase = createServiceClient();
  await supabase
    .from("profiles")
    .update({ email_verified_at: new Date().toISOString() })
    .eq("email_verification_token", token)
    .is("email_verified_at", null);

  return NextResponse.redirect(new URL("/?email_verified=true", request.url));
}
