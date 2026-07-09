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
      `*, role:roles(*), dealbreakers:candidate_dealbreakers(dealbreaker_tags(*)), software:candidate_software(software_tags(*))`,
      { count: "exact" }
    )
    .eq("visibility_status", "actively_looking");

  // ---- real radius search, finally ----
  // candidate_profiles.location and practice_locations.location are
  // PostGIS geography columns that have existed since the very first
  // migration, with a working radius SQL function already built
  // against them -- the only missing piece was ever actually writing
  // coordinates into them (now done in /api/candidate/profile and
  // /api/owner/profile) and ever actually calling that function (here).
  //
  // Only used when there's no explicit city/state override -- an
  // owner who's manually typed a specific different city/state into
  // the filter sheet is asking to search THERE, not "near me," so
  // that case keeps using the text-based match below instead.
  let radiusMatchedIds: string[] | null = null;
  let fallbackCity: string | null = null;
  let fallbackState: string | null = null;
  if (!city && !state) {
    const { data: hasLocation } = await supabase.rpc("practice_has_geocoded_location", {
      practice_id_input: authUser.user.id,
    });
    if (hasLocation) {
      const { data: withinRadius } = await supabase.rpc("candidates_within_radius_of_practice", {
        practice_id_input: authUser.user.id,
        radius_miles: Number(radiusMiles),
      });
      // Empty array (not null) signals "radius mode is active, use it"
      // even if zero candidates matched -- distinct from radiusMatchedIds
      // staying null, which means "no geocoded location, fall back."
      radiusMatchedIds = (withinRadius ?? []).map((c: { id: string }) => c.id);
    } else {
      // BUG FIX: this used to fall through to no location filter at all
      // once the practice wasn't geocoded -- the comment here claimed a
      // "text-match fallback" that was never actually wired up, so an
      // owner with an ungeocoded location (anyone who hasn't re-saved
      // their profile since radius search shipped) saw every actively-
      // looking candidate nationwide, completely unfiltered by
      // location. Confirmed in testing: a San Jose practice saw 29
      // Houston candidates with zero city/state filtering applied.
      // Real fix: fetch the practice's OWN saved city/state directly
      // (not the client-sent `city`/`state` params, which are only
      // set when the owner manually types a filter override) and use
      // that as the location filter below.
      const { data: ownLocation } = await supabase
        .from("practice_locations")
        .select("city, state")
        .eq("practice_id", authUser.user.id)
        .eq("is_primary", true)
        .maybeSingle();
      fallbackCity = ownLocation?.city ?? null;
      fallbackState = ownLocation?.state ?? null;
    }
  }

  if (radiusMatchedIds) {
    query = query.in("id", radiusMatchedIds);
  }

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
  } else if (fallbackCity) {
    query = query.ilike("city", fallbackCity);
  }
  if (state) {
    query = query.ilike("state", state);
  } else if (fallbackState) {
    query = query.ilike("state", fallbackState);
  }
  if (zip) {
    query = query.eq("zip", zip);
  }

  // { count: "exact" } above returns the TRUE total matching row count
  // via Postgres's separate count mechanism, unaffected by .limit(50)
  // below and NOT inflated by the one-to-many embedded resources
  // (dealbreakers/software) -- PostgREST computes this against the
  // base table's matching rows, not a naive SQL join product. Verify
  // this assumption still holds if the select's embedded resources
  // ever change shape.
  const { data: candidates, error, count: totalCount } = await query.limit(50);

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

  // Browse order is intentionally random, not chronological -- otherwise
  // candidates who joined first permanently sit at the top (or bottom,
  // depending on Postgres's default row order) of every owner's results
  // forever, which isn't fair distribution. There was no .order() clause
  // at all before this, so results came back in whatever order Postgres
  // happened to return them in (commonly insertion order in practice) --
  // not actually random, just unspecified and *looked* chronological.
  // Re-shuffled per request rather than persisted, so it's genuinely
  // different practice-to-practice and request-to-request, not just a
  // fixed reordering everyone sees the same way.
  for (let i = filtered.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [filtered[i], filtered[j]] = [filtered[j], filtered[i]];
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
    count: totalCount ?? results.length,
    tier,
  });
}
