import type { createClient } from "@/lib/supabase/server";
import { searchGoogleMapsPlaces, type SerperPlace } from "@/lib/serper/server";
import { resolveGoogleReviewUrl } from "@/lib/google-rating/resolve-url";

/** Straight-line distance in miles -- plenty precise for "is this the same building," not for routing. */
function distanceMiles(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 3958.8;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

interface MatchResult {
  place: SerperPlace;
  /** How we know this is the right listing -- surfaced to the caller/owner rather than hidden, since "exact" and "closest guess within 0.3mi" are very different confidence levels. */
  confidence: "exact_id" | "coordinates" | "name_only";
}

/**
 * Picks the right result out of Serper's search results using the
 * strongest available signal, in order:
 *   1. Exact place_id or CID match (from a URL like
 *      search.google.com/local/writereview?placeid=... or
 *      google.com/maps?cid=... -- when present, this is Google's own
 *      unique identifier, not a guess).
 *   2. Closest result by GPS distance to coordinates embedded in the
 *      practice's URL (from a /maps/place/.../@lat,lng URL) -- picks
 *      whichever candidate is physically nearest, capped at 0.3 miles
 *      so a same-name chain location across town doesn't get matched.
 *   3. Falls back to the top text-search result only when the URL
 *      gave us no verifiable identifier at all (e.g. a bare
 *      g.page short link Google didn't expose extra data on).
 */
function pickBestMatch(
  places: SerperPlace[],
  resolved: Awaited<ReturnType<typeof resolveGoogleReviewUrl>>
): MatchResult | null {
  if (places.length === 0) return null;

  if (resolved.placeId || resolved.cid) {
    const exact = places.find(
      (p) => (resolved.placeId && p.placeId === resolved.placeId) || (resolved.cid && p.cid === resolved.cid)
    );
    if (exact) return { place: exact, confidence: "exact_id" };
  }

  if (resolved.latitude != null && resolved.longitude != null) {
    let closest: { place: SerperPlace; distance: number } | null = null;
    for (const p of places) {
      if (p.latitude == null || p.longitude == null) continue;
      const d = distanceMiles(resolved.latitude, resolved.longitude, p.latitude, p.longitude);
      if (!closest || d < closest.distance) closest = { place: p, distance: d };
    }
    if (closest && closest.distance <= 0.3) {
      return { place: closest.place, confidence: "coordinates" };
    }
  }

  return { place: places[0], confidence: "name_only" };
}

/**
 * Looks up a practice's real Google rating and writes it to
 * practice_profiles. Shared by the manual "Refresh rating" button
 * (POST /api/owner/sync-google-rating), the auto-sync right after a
 * googleReviewUrl is saved (POST /api/owner/profile), and the
 * scheduled weekly re-sync (GET /api/cron/sync-google-ratings).
 *
 * Always resolves the practice's OWN pasted URL first (following
 * redirects on short links) rather than searching blind on name alone
 * -- see resolve-url.ts for the full rationale. Returns which
 * confidence tier the match was found at, so callers/UI can be honest
 * with the owner about how sure this actually is instead of presenting
 * every match as equally certain.
 */
type SyncResult =
  | { error: string; status: 400 | 404 }
  | {
      rating: number;
      ratingCount: number;
      matchedName: string;
      matchedAddress: string | null;
      confidence: MatchResult["confidence"];
    };

export async function syncGoogleRatingForPractice(
  supabase: Awaited<ReturnType<typeof createClient>>,
  practiceId: string
): Promise<SyncResult> {
  const { data: practice } = await supabase
    .from("practice_profiles")
    .select("practice_name, google_review_url, google_place_id, google_cid")
    .eq("id", practiceId)
    .single();

  if (!practice?.google_review_url) {
    return { error: "No Google review link saved yet.", status: 400 as const };
  }

  const resolved = await resolveGoogleReviewUrl(practice.google_review_url);

  const { data: location } = await supabase
    .from("practice_locations")
    .select("city, state")
    .eq("practice_id", practiceId)
    .eq("is_primary", true)
    .maybeSingle();

  // Prefer the name Google itself shows in the URL slug over our own
  // stored practice_name -- an owner's listing name and their
  // ChairMatch practice_name can legitimately differ (DBAs, rebrands).
  const query = [resolved.nameHint ?? practice.practice_name, location?.city, location?.state]
    .filter(Boolean)
    .join(" ");

  const places = await searchGoogleMapsPlaces(query);
  const match = pickBestMatch(places, resolved);

  if (!match || match.place.rating == null) {
    return {
      error: `Couldn't confidently match a Google listing for "${query}". Double-check the review link is correct.`,
      status: 404 as const,
    };
  }

  await supabase
    .from("practice_profiles")
    .update({
      google_rating: match.place.rating,
      google_rating_count: match.place.ratingCount ?? 0,
      google_rating_synced_at: new Date().toISOString(),
      // Persist whatever exact identifier we now have, so the next
      // scheduled re-sync can verify against a known-good ID rather
      // than re-parsing the URL and re-guessing from scratch.
      google_place_id: match.place.placeId ?? resolved.placeId ?? practice.google_place_id,
      google_cid: match.place.cid ?? resolved.cid ?? practice.google_cid,
    })
    .eq("id", practiceId);

  return {
    rating: match.place.rating,
    ratingCount: match.place.ratingCount ?? 0,
    matchedName: match.place.title,
    matchedAddress: match.place.address ?? null,
    confidence: match.confidence,
  };
}
