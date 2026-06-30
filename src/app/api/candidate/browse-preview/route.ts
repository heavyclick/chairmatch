import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * GET /api/candidate/browse-preview
 *
 * Lets a candidate see the browse experience the way an OWNER sees
 * it -- most cards blurred, but roughly 1 in every 10-20 left
 * unblurred, so they get a real feel for what hiring from this
 * perspective looks like. This is purely illustrative: it shows OTHER
 * candidates' cards (never the viewing candidate's own card), and
 * which specific cards are "sample unlocked" is randomized per
 * request rather than tied to any real subscription state, since no
 * actual paywall applies to a candidate browsing -- it's a preview,
 * not a real unlock.
 */
export async function GET() {
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { data: candidates, error } = await supabase
    .from("candidate_profiles")
    .select(`*, role:roles(*)`)
    .eq("visibility_status", "actively_looking")
    .neq("id", authData.user.id)
    .limit(30);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Sample roughly 1-in-10 to 1-in-20 unblurred, randomized per request.
  const results = (candidates ?? []).map((c) => {
    const sampleUnlocked = Math.random() < 1 / (10 + Math.floor(Math.random() * 11)); // ~1 in 10-20
    if (sampleUnlocked) return c;
    const { full_name, photo_url, ...rest } = c;
    return { ...rest, full_name: null, photo_url: null, is_locked: true };
  });

  return NextResponse.json({ results });
}
