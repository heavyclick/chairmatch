import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * GET /api/stats/density
 *
 * Returns live candidate counts by role within the owner's saved
 * radius -- the data behind the dashboard's "Active near you" hero.
 * Falls back to a city-only match if no lat/lng is available yet
 * (radius search requires geocoding the practice's zip on save,
 * which is a Phase 1 follow-up -- see README).
 */
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const city = searchParams.get("city");

  const { data: roles } = await supabase.from("roles").select("id, slug, label");
  if (!roles) return NextResponse.json({ stats: [] });

  const stats = await Promise.all(
    roles.map(async (role) => {
      let query = supabase
        .from("candidate_profiles")
        .select("id", { count: "exact", head: true })
        .eq("primary_role_id", role.id)
        .eq("visibility_status", "actively_looking");

      if (city) query = query.eq("city", city);

      const { count } = await query;
      return { role: role.label, slug: role.slug, count: count ?? 0 };
    })
  );

  return NextResponse.json({ stats: stats.filter((s) => s.count > 0) });
}
