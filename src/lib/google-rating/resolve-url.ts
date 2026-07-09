/**
 * Resolves a practice's own pasted Google review link and extracts
 * whatever exact identifiers Google embeds in the final URL, so the
 * rating sync (src/lib/google-rating/sync.ts) can confirm it found the
 * practice's actual listing rather than just trusting a name-based
 * search's top result.
 *
 * Share/review links come in a few shapes, and this handles all of
 * them by resolving to the final URL and reading whichever fields are
 * present -- confirmed by checking what this app's own onboarding form
 * tells owners to paste ("https://g.page/your-practice or Google Maps
 * link"):
 *
 *   - https://g.page/r/XXXX/review  (short link -- redirects)
 *   - https://search.google.com/local/writereview?placeid=ChIJ...
 *     (review-collection links commonly generated from a Google
 *     Business Profile dashboard carry the exact place_id right in
 *     the URL -- when present, this is a fully exact identifier, no
 *     search/guessing needed at all)
 *   - https://www.google.com/maps?cid=1234567890  (exact CID)
 *   - https://www.google.com/maps/place/Name/@lat,lng,zoom/data=
 *     !3m1!...!1s0xHEX:0xHEX!8m2!3d<lat>!4d<lng>  (embeds coordinates
 *     always, and a data_id hex pair that maps to a CID -- see
 *     hexDataIdToDecimalCid below)
 *
 * Deliberately does NOT scrape rating/review-count numbers out of the
 * Google Maps page's rendered HTML -- that content loads via
 * JavaScript, changes format without notice, and Google actively
 * blocks headless scraping of it. Identifiers embedded directly in the
 * URL are stable and don't require rendering anything.
 */

export interface ResolvedGoogleUrl {
  placeId: string | null;
  cid: string | null;
  latitude: number | null;
  longitude: number | null;
  /** Business name as it appears in the URL slug, if present -- e.g. "Bright-Smile-Dental" -> "Bright Smile Dental". Useful as a search hint, not authoritative. */
  nameHint: string | null;
  resolvedUrl: string;
}

/**
 * Google Maps place URLs embed a hex pair like
 * `0x89c259a61c75684f:0x79d31adb123348d2` -- the second hex number,
 * converted to decimal, is the same CID Google Maps accepts as
 * `?cid=`. Confirmed against Serper's own documented response shape,
 * where local results include both `cid` (decimal) and `placeId`
 * fields for the same place.
 */
function hexDataIdToDecimalCid(dataId: string): string | null {
  const match = dataId.match(/0x[0-9a-f]+:(0x[0-9a-f]+)/i);
  if (!match) return null;
  try {
    return BigInt(match[1]).toString(10);
  } catch {
    return null;
  }
}

export async function resolveGoogleReviewUrl(rawUrl: string): Promise<ResolvedGoogleUrl> {
  let resolvedUrl = rawUrl;
  try {
    // fetch() follows redirects by default -- this is what actually
    // turns a short g.page/r/XXXX link into Google's real, final URL
    // carrying the identifiers below. HEAD is enough; we only need
    // the final `res.url`, not the page body.
    const res = await fetch(rawUrl, { method: "HEAD", redirect: "follow" });
    resolvedUrl = res.url || rawUrl;
  } catch {
    // If the HEAD request fails (some servers reject HEAD), fall back
    // to the raw URL as-is -- most of the parsing below works on
    // un-redirected g.page links too, just less reliably.
  }

  const url = new URL(resolvedUrl);
  const placeId = url.searchParams.get("placeid") ?? url.searchParams.get("place_id");
  const cidParam = url.searchParams.get("cid");

  const dataMatch = resolvedUrl.match(/!1s(0x[0-9a-f]+:0x[0-9a-f]+)/i);
  const cidFromDataId = dataMatch ? hexDataIdToDecimalCid(dataMatch[1]) : null;

  const coordMatch = resolvedUrl.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
  const dataCoordMatch = resolvedUrl.match(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/);

  const nameMatch = resolvedUrl.match(/\/maps\/place\/([^/@]+)/);
  const nameHint = nameMatch ? decodeURIComponent(nameMatch[1]).replace(/[+-]/g, " ") : null;

  return {
    placeId,
    cid: cidParam ?? cidFromDataId,
    latitude: dataCoordMatch ? Number(dataCoordMatch[1]) : coordMatch ? Number(coordMatch[1]) : null,
    longitude: dataCoordMatch ? Number(dataCoordMatch[2]) : coordMatch ? Number(coordMatch[2]) : null,
    nameHint,
    resolvedUrl,
  };
}
