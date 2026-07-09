import { searchGoogleMapsPlaces } from "@/lib/serper/server";

/**
 * Geocodes a city/state/zip into approximate lat/lng coordinates, for
 * writing into the existing PostGIS `location` columns on
 * candidate_profiles and practice_locations (both already existed in
 * the schema from day one, with a working radius-search SQL function
 * already built -- candidates_within_radius() -- the only missing
 * piece was ever actually writing coordinates into them).
 *
 * Uses Serper's Maps search rather than a dedicated geocoding API:
 *   - The US Census Geocoder (free, no key, but US-only -- a fine fit
 *     otherwise) requires a street address at minimum; this app only
 *     ever collects city/state/zip, not a street address, so it can't
 *     be used here without collecting more data than the product asks
 *     for today.
 *   - Nominatim (OpenStreetMap) supports free-form city/zip queries,
 *     but its usage policy discourages exactly this kind of bulk
 *     commercial use without self-hosting -- the same category of
 *     concern already flagged for ISP lookups elsewhere in this
 *     codebase (src/lib/reviews/capture-signals.ts). Reaching for it
 *     here would be inconsistent with that standard.
 *   - Serper is already integrated, already has a documented key/
 *     rotation setup, and its Maps search responses already include
 *     real latitude/longitude per result (used for the Google-rating
 *     match verification in src/lib/google-rating/sync.ts) -- reusing
 *     proven infrastructure rather than adding a new dependency.
 *
 * This gives city/ZIP-level accuracy, not exact-address precision --
 * entirely sufficient for "is this candidate within N miles of this
 * practice," which is the only thing radius search needs.
 *
 * Consumes one Serper credit per geocode call. Only called when a
 * location actually changes (see call sites), and results should
 * generally be cached by simply not re-geocoding an unchanged
 * city/state/zip -- callers are responsible for that check.
 */
export async function geocodeLocation(
  city: string | null,
  state: string | null,
  zip: string | null
): Promise<{ latitude: number; longitude: number } | null> {
  const query = [zip, city, state].filter(Boolean).join(", ");
  if (!query) return null;

  try {
    const places = await searchGoogleMapsPlaces(query);
    const match = places[0];
    if (!match || match.latitude == null || match.longitude == null) {
      console.warn(`[geocoding] no coordinates found for "${query}"`);
      return null;
    }
    return { latitude: match.latitude, longitude: match.longitude };
  } catch (err) {
    // Fails soft -- a geocoding failure must never block a profile
    // save. The location simply won't have radius-search coverage
    // until the next successful geocode (e.g. next time they edit
    // their location, or a retried backfill run).
    console.error(`[geocoding] failed for "${query}":`, err);
    return null;
  }
}
