import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { CandidateProfile, BlurredCandidateProfile } from "@/types/database";

/**
 * GET /api/search
 *
 * Core browse/filter endpoint. Filters are available to every owner
 * regardless of subscription tier (per product decision -- the paywall
 * is identity/contact, not search). The blur/redaction of full_name and
 * photo_url for free-tier owners happens HERE, server-side, before the
 * response is ever serialized -- never send real name/photo to the
 * client and hide it with CSS. A free-tier owner reading the network
 * tab must not be able to see locked candidates' identities.
 */
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { searchParams } = new URL(request.url);

  const { data: authUser } = await supabase.auth.getUser();
  if (!authUser.user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { data: practice } = await supabase
    .from("practice_profiles")
    .select("subscription_tier")
    .eq("id", authUser.user.id)
    .single();

  const tier = practice?.subscription_tier ?? "free";
  const isUnlocked = tier === "standard" || tier === "pro";

  // ---- parse filters ----
  const roleSlug = searchParams.get("role");
  const employmentType = searchParams.get("employment_type");
  const payMin = searchParams.get("pay_min");
  const payMax = searchParams.get("pay_max");
  const minYears = searchParams.get("min_years_experience");
  const lat = searchParams.get("lat");
  const lng = searchParams.get("lng");
  const radiusMiles = searchParams.get("radius_miles") ?? "15";
  const openToRelocation = searchParams.get("open_to_relocation");
  const excludeDealbreakers = searchParams.get("exclude_dealbreakers"); // comma-separated slugs

  let query = supabase
    .from("candidate_profiles")
    .select(
      `*, role:roles(*), dealbreakers:candidate_dealbreakers(dealbreaker_tags(*))`
    )
    .eq("visibility_status", "actively_looking");

  if (roleSlug) {
    query = query.eq("roles.slug", roleSlug);
  }
  if (employmentType) {
    query = query.contains("employment_types", [employmentType]);
  }
  if (payMin) {
    query = query.gte("pay_range_max", Number(payMin));
  }
  if (payMax) {
    query = query.lte("pay_range_min", Number(payMax));
  }
  if (minYears) {
    query = query.gte("years_experience", Number(minYears));
  }
  if (openToRelocation === "true") {
    query = query.eq("open_to_relocation", true);
  }

  const { data: candidates, error } = await query.limit(50);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Radius filtering via the candidates_within_radius() Postgres function
  // when lat/lng provided -- kept as a second query rather than folding into
  // the builder above because PostgREST's filter builder doesn't compose
  // cleanly with a custom geography RPC; revisit if this becomes a
  // performance bottleneck at scale.
  let filtered = candidates ?? [];
  if (lat && lng) {
    const { data: withinRadius } = await supabase.rpc(
      "candidates_within_radius",
      {
        center_lat: Number(lat),
        center_lng: Number(lng),
        radius_miles: Number(radiusMiles),
      }
    );
    const allowedIds = new Set((withinRadius ?? []).map((c: { id: string }) => c.id));
    filtered = filtered.filter((c) => allowedIds.has(c.id));
  }

  // Dealbreaker exclusion: drop candidates who've flagged a dealbreaker
  // the owner asked to exclude (e.g. owner is a DSO, excludes "no_dso" candidates).
  if (excludeDealbreakers) {
    const excludeSlugs = new Set(excludeDealbreakers.split(","));
    filtered = filtered.filter((c) => {
      const candidateDealbreakerSlugs = (c.dealbreakers ?? []).map(
        (d: { dealbreaker_tags: { slug: string } }) => d.dealbreaker_tags.slug
      );
      return !candidateDealbreakerSlugs.some((slug: string) => excludeSlugs.has(slug));
    });
  }

  // ---- the actual paywall enforcement ----
  const results: (CandidateProfile | BlurredCandidateProfile)[] = filtered.map(
    (c) => {
      if (isUnlocked) return c as CandidateProfile;
      const { full_name, photo_url, ...rest } = c;
      return {
        ...rest,
        full_name: null,
        photo_url: null,
        is_locked: true,
      } as BlurredCandidateProfile;
    }
  );

  return NextResponse.json({
    results,
    count: results.length,
    tier,
  });
}
