import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

/**
 * GET /api/reviews/search
 *
 * Public, unauthenticated candidate search by name/city/state, so a
 * patient with no account can find the right person to review. This
 * intentionally surfaces full_name and photo_url WITHOUT the owner-side
 * blur logic -- that blur exists to gate paying-owner access behind a
 * subscription; it has nothing to do with public review discovery,
 * which is a different, intentionally open surface by design.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const name = searchParams.get("name");
  const city = searchParams.get("city");
  const state = searchParams.get("state");

  if (!name && !city && !state) {
    return NextResponse.json({ results: [] });
  }

  const supabase = createServiceClient();
  let query = supabase
    .from("candidate_profiles")
    .select("id, full_name, photo_url, city, state, role:roles(label)")
    .limit(20);

  if (name) query = query.ilike("full_name", `%${name}%`);
  if (city) query = query.ilike("city", `%${city}%`);
  if (state) query = query.eq("state", state);

  const { data: candidates, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const results = await Promise.all(
    (candidates ?? []).map(async (c) => {
      const { data: reviews } = await supabase
        .from("candidate_reviews")
        .select("rating")
        .eq("candidate_id", c.id)
        .eq("is_visible", true);
      const reviewCount = reviews?.length ?? 0;
      const averageRating = reviewCount
        ? (reviews ?? []).reduce((sum, r) => sum + r.rating, 0) / reviewCount
        : null;
      return { ...c, averageRating, reviewCount };
    })
  );

  return NextResponse.json({ results });
}
