import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { SerperConfigError, SerperExhaustedError } from "@/lib/serper/server";
import { syncGoogleRatingForPractice } from "@/lib/google-rating/sync";

/**
 * POST /api/owner/sync-google-rating
 *
 * Fetches the practice's real Google rating/review count via Serper's
 * Maps search (see src/lib/serper/server.ts for why Serper instead of
 * the official Google Places API) and writes it to practice_profiles.
 *
 * This route exists because pasting a Google review URL during
 * onboarding previously did nothing -- there was no code anywhere that
 * ever read it and fetched a rating. It's called two ways:
 *   1. Automatically from /api/owner/profile right after a
 *      googleReviewUrl is saved/changed, so the rating shows up without
 *      the owner doing anything extra.
 *   2. Manually, via a "Refresh rating" button on the edit/profile
 *      screens, since name-based search matching isn't always exact and
 *      an owner may want to re-trigger it (e.g. their listing's name
 *      changed, or the practice has a common name with multiple
 *      Google listings nearby).
 *
 * Always returns the matched business name/address back to the caller
 * (rather than only a boolean) -- since this is a search match, not a
 * direct ID lookup, the UI should let the owner see and sanity-check
 * what got matched, not just trust it silently.
 */
export async function POST() {
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  try {
    const result = await syncGoogleRatingForPractice(supabase, authData.user.id);
    if ("error" in result) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof SerperConfigError) {
      return NextResponse.json({ error: err.message }, { status: 500 });
    }
    if (err instanceof SerperExhaustedError) {
      console.error("[/api/owner/sync-google-rating]", err.message);
      return NextResponse.json(
        { error: "Couldn't reach Google ratings right now (all configured keys failed). Try again shortly." },
        { status: 502 }
      );
    }
    throw err;
  }
}
