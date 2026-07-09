/**
 * Server-only Serper.dev client for pulling real Google Maps ratings,
 * used instead of the official Google Places API since that requires
 * billing setup that isn't available right now. Serper wraps Google
 * Search/Maps results -- not as precise as a direct Place ID lookup
 * (it's a name+location search, not an exact-record fetch), which is
 * why the sync route that calls this always returns the matched
 * business name/address back to the caller for confirmation rather
 * than silently trusting the top result.
 *
 * Multi-key support: SERPER_API_KEYS is a comma-separated list. Serper's
 * free tier is 2,500 credits per account -- pasting multiple keys here
 * (e.g. from multiple free accounts) means a request that hits a
 * rate-limited/exhausted key automatically retries the next one rather
 * than failing outright. Falls back to the old single-key SERPER_API_KEY
 * var too, so either env var name works.
 */

export interface SerperPlace {
  title: string;
  address?: string;
  rating?: number;
  ratingCount?: number;
  cid?: string;
  placeId?: string;
  latitude?: number;
  longitude?: number;
}

interface SerperMapsResponse {
  places?: SerperPlace[];
}

function getApiKeys(): string[] {
  const multi = process.env.SERPER_API_KEYS ?? "";
  const single = process.env.SERPER_API_KEY ?? "";
  const keys = [...multi.split(","), single]
    .map((k) => k.trim())
    .filter(Boolean);
  return Array.from(new Set(keys));
}

export class SerperConfigError extends Error {}
export class SerperExhaustedError extends Error {}

/**
 * Searches Google Maps via Serper for a business by name + location,
 * trying each configured key in turn if one is rate-limited (HTTP 429)
 * or out of credits (commonly surfaces as 403 on Serper). Returns the
 * raw list of matches -- the caller picks/confirms the right one rather
 * than this function silently assuming the top result is correct.
 */
export async function searchGoogleMapsPlaces(query: string): Promise<SerperPlace[]> {
  const keys = getApiKeys();
  if (keys.length === 0) {
    throw new SerperConfigError(
      "No Serper API key configured. Set SERPER_API_KEY (or SERPER_API_KEYS for multiple, comma-separated) in your env."
    );
  }

  let lastError: unknown = null;

  for (const key of keys) {
    try {
      const res = await fetch("https://google.serper.dev/maps", {
        method: "POST",
        headers: {
          "X-API-KEY": key,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ q: query }),
      });

      if (res.status === 429 || res.status === 403) {
        // Rate-limited or out of credits on this key -- try the next one.
        lastError = new Error(`Serper key ending in ...${key.slice(-4)} returned ${res.status}`);
        continue;
      }

      if (!res.ok) {
        lastError = new Error(`Serper request failed: ${res.status} ${await res.text()}`);
        continue;
      }

      const data = (await res.json()) as SerperMapsResponse;
      return data.places ?? [];
    } catch (err) {
      lastError = err;
      continue;
    }
  }

  throw new SerperExhaustedError(
    `All ${keys.length} configured Serper key(s) failed. Last error: ${
      lastError instanceof Error ? lastError.message : String(lastError)
    }`
  );
}
