import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * GET /api/owner/profile-summary
 *
 * Lightweight summary used by both /owner/dashboard and /owner/browse
 * so they read the SAME location data instead of one querying the
 * database and the other using a hardcoded placeholder (the bug this
 * fixes -- see comment in browse/page.tsx).
 */
export async function GET() {
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { data: practice } = await supabase
    .from("practice_profiles")
    .select("practice_name, locations:practice_locations(city, state, radius_miles, is_primary)")
    .eq("id", authData.user.id)
    .maybeSingle();

  if (!practice) {
    return NextResponse.json({ practiceName: null, city: null, radiusMiles: 15 });
  }

  const locations = Array.isArray(practice.locations) ? practice.locations : practice.locations ? [practice.locations] : [];
  const primary = locations.find((l) => l.is_primary) ?? locations[0];

  return NextResponse.json({
    practiceName: practice.practice_name,
    city: primary?.city ?? null,
    state: primary?.state ?? null,
    radiusMiles: primary?.radius_miles ?? 15,
  });
}
