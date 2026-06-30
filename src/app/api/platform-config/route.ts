import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * GET /api/platform-config
 *
 * Returns platform-wide config flags -- currently just whether
 * candidate practice-browsing is unlocked yet. This is intentionally
 * ONE FIXED DATE for everyone (read from platform_config in migration
 * 0003), not a per-candidate "30 days after your signup" calculation
 * -- the founder's stated reason for the delay is platform maturity
 * ("we just launched, don't want them to see there's no practices
 * yet"), which is a property of the PLATFORM, not of any individual
 * candidate's tenure.
 */
export async function GET() {
  const supabase = await createClient();

  const { data } = await supabase
    .from("platform_config")
    .select("value")
    .eq("key", "candidate_browse_unlock_at")
    .maybeSingle();

  const unlockAt = data?.value ? new Date(data.value) : null;
  const isUnlocked = unlockAt ? Date.now() >= unlockAt.getTime() : true;

  return NextResponse.json({
    candidateBrowseUnlocked: isUnlocked,
    candidateBrowseUnlockAt: unlockAt?.toISOString() ?? null,
  });
}
