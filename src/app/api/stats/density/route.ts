import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * GET /api/stats/density
 *
 * Returns live candidate counts by role within the owner's saved
 * radius -- the data behind the dashboard's "Active near you" hero.
 *
 * Uses real PostGIS radius search (candidates_within_radius_of_practice,
 * see migration 0015) when the practice's location has been geocoded
 * -- geocoding happens automatically in /api/owner/profile whenever a
 * practice's city/state/zip changes (see src/lib/geocoding/geocode.ts).
 * Falls back to exact city-text matching for practices that haven't
 * re-saved their location since this shipped, so existing behavior
 * degrades gracefully rather than suddenly returning zero results.
 */
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const city = searchParams.get("city");
  const radiusMiles = Number(searchParams.get("radius_miles") ?? "15");

  const { data: roles } = await supabase.from("roles").select("id, slug, label");
  if (!roles) return NextResponse.json({ stats: [] });

  // Resolve radius-matched candidate IDs once, shared across every
  // role's count below, rather than re-running the spatial query once
  // per role.
  let radiusMatchedIds: string[] | null = null;
  if (!city) {
    const { data: hasLocation } = await supabase.rpc("practice_has_geocoded_location", {
      practice_id_input: authData.user.id,
    });
    if (hasLocation) {
      const { data: withinRadius } = await supabase.rpc("candidates_within_radius_of_practice", {
        practice_id_input: authData.user.id,
        radius_miles: radiusMiles,
      });
      radiusMatchedIds = (withinRadius ?? []).map((c: { id: string }) => c.id);
    }
  }

  const stats = await Promise.all(
    roles.map(async (role) => {
      let query = supabase
        .from("candidate_profiles")
        .select("id", { count: "exact", head: true })
        .eq("primary_role_id", role.id)
        .eq("visibility_status", "actively_looking");

      if (radiusMatchedIds) {
        query = query.in("id", radiusMatchedIds);
      } else if (city) {
        query = query.eq("city", city);
      }

      const { count } = await query;
      return { role: role.label, slug: role.slug, count: count ?? 0 };
    })
  );

  return NextResponse.json({ stats: stats.filter((s) => s.count > 0) });
}
