import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * GET /api/candidate/profile-views
 *
 * Returns this week's view count plus the list of practices that
 * viewed this candidate's profile, with enough info to link to each
 * practice's profile. This replaces the hardcoded "-" placeholder
 * that previously stood in for this entire feature -- there was no
 * tracking at all before the profile_views table (migration 0002)
 * and this endpoint.
 */
function oneWeekAgoIso(): string {
  return new Date(Date.now() - 7 * 86400000).toISOString();
}

export async function GET() {
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { data: views, error } = await supabase
    .from("profile_views")
    .select("viewed_at, viewer_practice_id, practice:practice_profiles(practice_name, photo_url)")
    .eq("candidate_id", authData.user.id)
    .gte("viewed_at", oneWeekAgoIso())
    .order("viewed_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // De-duplicate by practice -- a practice viewing the same profile
  // three times this week should show once in the list, not three
  // times, even though the raw count below still reflects total views.
  const seen = new Set<string>();
  const uniqueViewers = (views ?? []).filter((v) => {
    if (seen.has(v.viewer_practice_id)) return false;
    seen.add(v.viewer_practice_id);
    return true;
  });

  return NextResponse.json({
    totalViewsThisWeek: views?.length ?? 0,
    viewers: uniqueViewers,
  });
}
