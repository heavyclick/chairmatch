import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

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
      .select("id")
      .eq("practice_id", authData.user.id)
      .eq("is_primary", true)
      .maybeSingle();

    const locationUpdate: Record<string, unknown> = {};
    if (body.city !== undefined) locationUpdate.city = body.city;
    if (body.state !== undefined) locationUpdate.state = body.state;
    if (body.zip !== undefined) locationUpdate.zip = body.zip;

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

  return NextResponse.json({ success: true });
}
