import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { syncGoogleRatingForPractice } from "@/lib/google-rating/sync";
import { SerperConfigError, SerperExhaustedError } from "@/lib/serper/server";
import { generatePracticeChips } from "@/lib/ai/practice-chips";
import { geocodeLocation } from "@/lib/geocoding/geocode";

/**
 * POST /api/owner/profile
 *
 * Creates or updates the current user's practice_profiles row, its
 * primary location, and software tags. Used both by the full
 * onboarding wizard AND by single-field edit screens -- every field is
 * optional in the request body, only fields actually present get
 * written.
 *
 * Previously this never wrote `state` even though practice_locations
 * has had a state column since the original schema -- the onboarding
 * UI simply never collected it. Fixed as part of this rewrite.
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getUser();

  if (!authData.user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const body = await request.json();

  const profileUpdate: Record<string, unknown> = { id: authData.user.id };
  const directFieldMap: Record<string, string> = {
    practiceName: "practice_name",
    practiceType: "practice_type",
    specialty: "specialty",
    photoUrl: "photo_url",
    cultureText: "culture_text",
    thriveText: "thrive_text",
    honestChallengesText: "honest_challenges_text",
    idealStaffText: "ideal_staff_text",
    googleReviewUrl: "google_review_url",
  };
  for (const [bodyKey, column] of Object.entries(directFieldMap)) {
    if (body[bodyKey] !== undefined) profileUpdate[column] = body[bodyKey];
  }

  if (Object.keys(profileUpdate).length > 1) {
    const { error: upsertError } = await supabase.from("practice_profiles").upsert(profileUpdate);
    if (upsertError) {
      return NextResponse.json({ error: upsertError.message }, { status: 500 });
    }
  }

  // Location: only touched if any location field is present.
  if (body.city !== undefined || body.state !== undefined || body.zip !== undefined) {
    const { data: existingLocation } = await supabase
      .from("practice_locations")
      .select("id, city, state, zip")
      .eq("practice_id", authData.user.id)
      .eq("is_primary", true)
      .maybeSingle();

    const locationUpdate: Record<string, unknown> = {};
    if (body.city !== undefined) locationUpdate.city = body.city;
    if (body.state !== undefined) locationUpdate.state = body.state;
    if (body.zip !== undefined) locationUpdate.zip = body.zip;

    // Geocode when the location actually changed -- see the identical
    // reasoning in /api/candidate/profile. Writes to the `location`
    // PostGIS column (existed since day one, unused until now) via
    // WKT text, the standard way to write a geography value through
    // PostgREST without a dedicated RPC round trip.
    const newCity = (locationUpdate.city as string | undefined) ?? existingLocation?.city ?? null;
    const newState = (locationUpdate.state as string | undefined) ?? existingLocation?.state ?? null;
    const newZip = (locationUpdate.zip as string | undefined) ?? existingLocation?.zip ?? null;
    const locationChanged =
      newCity !== (existingLocation?.city ?? null) ||
      newState !== (existingLocation?.state ?? null) ||
      newZip !== (existingLocation?.zip ?? null);

    if (locationChanged) {
      const coords = await geocodeLocation(newCity, newState, newZip);
      if (coords) {
        locationUpdate.location = `SRID=4326;POINT(${coords.longitude} ${coords.latitude})`;
      }
    }

    if (existingLocation) {
      await supabase.from("practice_locations").update(locationUpdate).eq("id", existingLocation.id);
    } else {
      await supabase.from("practice_locations").insert({
        practice_id: authData.user.id,
        ...locationUpdate,
        is_primary: true,
        radius_miles: 15,
      });
    }
  }

  if (Array.isArray(body.softwareSlugs) || Array.isArray(body.customSoftware)) {
    await supabase.from("practice_software").delete().eq("practice_id", authData.user.id);
    const customLabels: string[] = (body.customSoftware ?? []).filter((s: string) => s.trim());

    const customTagIds: number[] = [];
    for (const label of customLabels) {
      const slug = label.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_");
      const { data: existingTag } = await supabase
        .from("software_tags")
        .select("id")
        .eq("slug", slug)
        .maybeSingle();
      if (existingTag) {
        customTagIds.push(existingTag.id);
      } else {
        const { data: newTag } = await supabase
          .from("software_tags")
          .insert({ slug, label: label.trim(), is_user_submitted: true })
          .select("id")
          .single();
        if (newTag) customTagIds.push(newTag.id);
      }
    }

    const presetSlugs: string[] = body.softwareSlugs ?? [];
    const { data: presetRows } = presetSlugs.length
      ? await supabase.from("software_tags").select("id, slug").in("slug", presetSlugs)
      : { data: [] };

    const allTagIds = [...(presetRows ?? []).map((r) => r.id), ...customTagIds];
    if (allTagIds.length > 0) {
      await supabase.from("practice_software").insert(
        allTagIds.map((tagId) => ({ practice_id: authData.user.id, tag_id: tagId }))
      );
    }
  }

  if (Array.isArray(body.workdays)) {
    // Reuses the candidate_availability table shape conceptually, but
    // a practice's operating hours live on practice_locations as a
    // jsonb column rather than a separate join table, since a practice
    // has at most a handful of locations rather than many independent
    // availability rows -- simpler to keep it inline.
    const { data: existingLocation } = await supabase
      .from("practice_locations")
      .select("id")
      .eq("practice_id", authData.user.id)
      .eq("is_primary", true)
      .maybeSingle();
    if (existingLocation) {
      await supabase
        .from("practice_locations")
        .update({ operating_hours: body.workdays })
        .eq("id", existingLocation.id);
    }
  }

  if (Array.isArray(body.galleryPhotos)) {
    await supabase.from("practice_gallery_photos").delete().eq("practice_id", authData.user.id);
    if (body.galleryPhotos.length > 0) {
      await supabase.from("practice_gallery_photos").insert(
        body.galleryPhotos.map((p: { photoUrl: string; caption?: string }, i: number) => ({
          practice_id: authData.user.id,
          photo_url: p.photoUrl,
          caption: p.caption || null,
          sort_order: i,
        }))
      );
    }
  }

  // Regenerate standout chips whenever content that would actually
  // change the answer is touched (culture/thrive text or software) --
  // same trigger philosophy as the candidate-side equivalent in
  // /api/candidate/profile. Best-effort: a generation failure must not
  // fail the profile save itself.
  if (body.cultureText !== undefined || body.thriveText !== undefined || Array.isArray(body.softwareSlugs)) {
    try {
      const { data: fresh } = await supabase
        .from("practice_profiles")
        .select(
          "specialty, culture_text, thrive_text, google_rating, google_rating_count, software:practice_software(software_tags(label))"
        )
        .eq("id", authData.user.id)
        .single();

      if (fresh) {
        const chips = await generatePracticeChips({
          specialty: fresh.specialty,
          cultureText: fresh.culture_text,
          thriveText: fresh.thrive_text,
          // NOTE: PostgREST returns a singular object here, not an array
          // -- practice_software.tag_id -> software_tags.id is
          // many-to-one, so each row embeds exactly one software_tags
          // object. Same type-inference quirk documented in
          // src/lib/candidate-search/match-filters.ts (this project's
          // Database type is currently a placeholder `any`, so
          // supabase-js can't see real FK cardinality and defaults to
          // typing the embed as an array). Do NOT "fix" this with [0]
          // indexing -- that would silently return undefined for every
          // practice.
          software: (
            (fresh.software ?? []) as unknown as { software_tags: { label: string } }[]
          ).map((s) => s.software_tags.label),
          googleRating: fresh.google_rating,
          googleRatingCount: fresh.google_rating_count,
        });
        if (chips) {
          await supabase
            .from("practice_profiles")
            .update({ ai_practice_chips: chips, ai_practice_chips_generated_at: new Date().toISOString() })
            .eq("id", authData.user.id);
        }
      }
    } catch (err) {
      console.error("[/api/owner/profile] practice chip regeneration failed:", err);
    }
  }

  let googleRatingSync:
    | Awaited<ReturnType<typeof syncGoogleRatingForPractice>>
    | { skipped: true }
    | { error: string; status: number } = { skipped: true };

  // Auto-sync the Google rating right after saving a review link, so it
  // shows up without the owner needing to find and click a separate
  // button. A sync failure here (bad match, Serper down, no key
  // configured) must NOT fail the whole profile save -- the profile data
  // is still valid and saved either way, so this is best-effort and
  // reported back to the client as a soft warning, not an error.
  if (typeof body.googleReviewUrl === "string" && body.googleReviewUrl.trim()) {
    try {
      googleRatingSync = await syncGoogleRatingForPractice(supabase, authData.user.id);
    } catch (err) {
      const message =
        err instanceof SerperConfigError || err instanceof SerperExhaustedError
          ? err.message
          : "Couldn't sync Google rating right now.";
      googleRatingSync = { error: message, status: 502 };
      console.error("[/api/owner/profile] google rating auto-sync failed:", err);
    }
  }

  return NextResponse.json({ success: true, googleRatingSync });
}
