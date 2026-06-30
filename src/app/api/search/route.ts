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
 * response is ever serialized.
 *
 * IMPORTANT: this was previously broken for role filtering. The old
 * code called .eq("roles.slug", roleSlug) against a query that embeds
 * roles via `role:roles(*)` in select() -- PostgREST does not support
 * filtering on embedded/joined resource columns that way; it's silently
 * ignored rather than erroring, which is exactly the kind of bug that's
 * invisible until someone actually checks. Fixed by resolving the role
 * slug to its numeric id first, then filtering on the base table's own
 * primary_role_id column directly.
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
  const remoteOnly = searchParams.get("remote_only");
  const city = searchParams.get("city");
  const state = searchParams.get("state");
  const zip = searchParams.get("zip");
  const softwareSlugs = searchParams.get("software"); // comma-separated
  const excludeDealbreakers = searchParams.get("exclude_dealbreakers"); // comma-separated slugs
  const availableDays = searchParams.get("available_days"); // comma-separated day numbers

  let query = supabase
    .from("candidate_profiles")
    .select(
      `*, role:roles(*), dealbreakers:candidate_dealbreakers(dealbreaker_tags(*)), software:candidate_software(software_tags(*))`
    )
    .eq("visibility_status", "actively_looking");

  // Resolve role slug -> id BEFORE filtering, rather than filtering on
  // the embedded roles(*) resource directly (the bug described above).
  if (roleSlug) {
    const { data: roleRow, error: roleError } = await supabase
      .from("roles")
      .select("id")
      .eq("slug", roleSlug)
      .single();

    if (roleError || !roleRow) {
      console.error("[/api/search] role lookup failed for slug:", roleSlug, roleError);
      // Fail closed (no results) rather than silently ignoring the
      // filter and returning everyone -- a broken filter that returns
      // nothing is obviously wrong and gets noticed; one that returns
      // everything looks like it's "sort of working" and hides the bug,
      // which is exactly what happened before.
      return NextResponse.json({ results: [], count: 0, tier });
    }
    query = query.eq("primary_role_id", roleRow.id);
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
  if (remoteOnly === "true") {
    query = query.eq("open_to_remote", true);
  }
  if (city) {
    query = query.ilike("city", city);
  }
  if (state) {
    query = query.ilike("state", state);
  }
  if (zip) {
    query = query.eq("zip", zip);
  }

  const { data: candidates, error } = await query.limit(50);

  if (error) {
    console.error("[/api/search] query failed:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  let filtered = candidates ?? [];

  // Radius filtering via the candidates_within_radius() Postgres function
  // when lat/lng provided.
  if (lat && lng) {
    const { data: withinRadius, error: radiusError } = await supabase.rpc(
      "candidates_within_radius",
      {
        center_lat: Number(lat),
        center_lng: Number(lng),
        radius_miles: Number(radiusMiles),
      }
    );
    if (radiusError) {
      console.error("[/api/search] radius RPC failed:", radiusError);
    } else {
      const allowedIds = new Set((withinRadius ?? []).map((c: { id: string }) => c.id));
      filtered = filtered.filter((c) => allowedIds.has(c.id));
    }
  }

  if (softwareSlugs) {
    const wantedSlugs = new Set(softwareSlugs.split(","));
    filtered = filtered.filter((c) => {
      const candidateSoftwareSlugs = (c.software ?? []).map(
        (s: { software_tags: { slug: string } }) => s.software_tags.slug
      );
      return candidateSoftwareSlugs.some((slug: string) => wantedSlugs.has(slug));
    });
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

  if (availableDays) {
    const wantedDays = new Set(availableDays.split(",").map(Number));
    const candidateIds = filtered.map((c) => c.id);
    if (candidateIds.length > 0) {
      const { data: availabilityRows } = await supabase
        .from("candidate_availability")
        .select("candidate_id, day_of_week")
        .in("candidate_id", candidateIds);
      const idsWithMatchingDay = new Set(
        (availabilityRows ?? [])
          .filter((a) => wantedDays.has(a.day_of_week))
          .map((a) => a.candidate_id)
      );
      filtered = filtered.filter((c) => idsWithMatchingDay.has(c.id));
    }
  }

  // A candidate may have hidden their profile from THIS specific
  // practice (e.g. "hide me from my current employer") -- distinct
  // from visibility_status, which is global/all-or-nothing. Enforced
  // here, server-side, same principle as the blur logic below: this
  // must not be something the client can bypass by just not checking.
  const { data: blocks } = await supabase
    .from("candidate_practice_blocks")
    .select("candidate_id")
    .eq("practice_id", authUser.user.id);
  if (blocks && blocks.length > 0) {
    const blockedIds = new Set(blocks.map((b) => b.candidate_id));
    filtered = filtered.filter((c) => !blockedIds.has(c.id));
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
