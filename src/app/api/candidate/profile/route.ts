import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { checkMatchAlertsForCandidate } from "@/lib/match-alerts/check-and-notify";
import { generateSkillChips } from "@/lib/ai/skill-chips";
import { geocodeLocation } from "@/lib/geocoding/geocode";

/**
 * POST /api/candidate/profile
 *
 * Creates or updates the current user's candidate_profiles row plus
 * its related join tables (aliases, dealbreakers, software, work
 * history, availability). Used both by the full onboarding wizard AND
 * by the single-field edit screens (see /candidate/settings/edit/[field])
 * -- every field is optional in the request body; only the fields
 * actually present get written, so a single-field edit doesn't need to
 * resend the entire profile.
 *
 * This replaces the original version of this route, which only
 * accepted a fixed set of fields and always overwrote the whole
 * profile -- that made single-field editing impossible without
 * resending everything, which is exactly the "edit makes you redo all
 * 7 steps" problem flagged in the audit.
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getUser();

  if (!authData.user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const body = await request.json();

  // ---- resolve role slug -> id if a role change was submitted ----
  let primaryRoleId: number | undefined;
  if (body.primaryRoleSlug) {
    const { data: roleRow } = await supabase
      .from("roles")
      .select("id")
      .eq("slug", body.primaryRoleSlug)
      .single();
    if (!roleRow) {
      return NextResponse.json(
        { error: "Role not found in database -- has the schema been seeded?" },
        { status: 400 }
      );
    }
    primaryRoleId = roleRow.id;
  }

  // ---- build a sparse update object: only include keys actually sent ----
  const update: Record<string, unknown> = { id: authData.user.id, updated_at: new Date().toISOString() };

  const directFieldMap: Record<string, string> = {
    fullName: "full_name",
    photoUrl: "photo_url",
    city: "city",
    state: "state",
    zip: "zip",
    employmentTypes: "employment_types",
    openToRelocation: "open_to_relocation",
    openToRemote: "open_to_remote",
    payUnit: "pay_unit",
    yearsExperience: "years_experience",
    university: "university",
    certifications: "certifications",
    ceCourses: "ce_courses",
    skills: "skills",
    hobbies: "hobbies",
    valueAddText: "value_add_text",
    futureGoalsText: "future_goals_text",
    recoveryScenarioText: "recovery_scenario_text",
    idealPracticeText: "ideal_practice_text",
    visibilityStatus: "visibility_status",
    collectionsPercent: "collections_percent",
    collectionsNote: "collections_note",
    termsAcceptedAt: "terms_accepted_at",
  };

  for (const [bodyKey, column] of Object.entries(directFieldMap)) {
    if (body[bodyKey] !== undefined) {
      update[column] = body[bodyKey];
    }
  }

  // numeric fields that arrive as strings from form inputs
  if (body.payMin !== undefined) update.pay_range_min = body.payMin === "" ? null : Number(body.payMin);
  if (body.payMax !== undefined) update.pay_range_max = body.payMax === "" ? null : Number(body.payMax);
  if (primaryRoleId !== undefined) update.primary_role_id = primaryRoleId;

  if (Object.keys(update).length > 2) {
    // Recompute completeness only on a meaningful update -- avoids a
    // stale/misleading score on a pure-metadata write.
    const { data: existing } = await supabase
      .from("candidate_profiles")
      .select("*")
      .eq("id", authData.user.id)
      .maybeSingle();
    update.profile_completeness_score = computeCompleteness({ ...existing, ...update });

    // Geocode only when location actually changed -- avoids burning a
    // Serper credit on every unrelated field edit. Writes to the
    // `location` PostGIS column via WKT text (`SRID=4326;POINT(lng
    // lat)`), which is the standard way to write a geography value
    // through PostgREST/supabase-js without a dedicated RPC round
    // trip. This column has existed since the very first migration
    // (with a working candidates_within_radius() SQL function already
    // built against it) -- nothing ever actually populated it until
    // now, which is the real reason radius search never worked despite
    // the database-level infrastructure being correct and ready.
    const locationChanged =
      ("city" in update && update.city !== existing?.city) ||
      ("state" in update && update.state !== existing?.state) ||
      ("zip" in update && update.zip !== existing?.zip);
    if (locationChanged) {
      const coords = await geocodeLocation(
        (update.city as string | undefined) ?? existing?.city ?? null,
        (update.state as string | undefined) ?? existing?.state ?? null,
        (update.zip as string | undefined) ?? existing?.zip ?? null
      );
      if (coords) {
        update.location = `SRID=4326;POINT(${coords.longitude} ${coords.latitude})`;
      }
    }

    const { error: upsertError } = await supabase.from("candidate_profiles").upsert(update);
    if (upsertError) {
      return NextResponse.json({ error: upsertError.message }, { status: 500 });
    }
  }

  // ---- join tables: only touched if their key is present in the request ----
  // Every write below now checks and logs its result. Previously none
  // of these checked for errors at all -- a silent RLS/constraint/type
  // failure on any of them would produce zero visible symptom beyond
  // "the data just isn't there when you look," which is exactly the
  // shape of the reported work-history bug. `warnings` is returned in
  // the response so a failure is visible to the caller too, not just
  // in server logs.
  const warnings: string[] = [];

  if (Array.isArray(body.aliasSlugs)) {
    const { error: delErr } = await supabase.from("candidate_role_aliases").delete().eq("candidate_id", authData.user.id);
    if (delErr) { console.error("[profile] alias delete failed:", delErr); warnings.push(`aliases: ${delErr.message}`); }
    if (body.aliasSlugs.length > 0) {
      const { data: rows } = await supabase.from("role_aliases").select("id, slug").in("slug", body.aliasSlugs);
      if (rows?.length) {
        const { error: insErr } = await supabase.from("candidate_role_aliases").insert(
          rows.map((a) => ({ candidate_id: authData.user.id, alias_id: a.id }))
        );
        if (insErr) { console.error("[profile] alias insert failed:", insErr); warnings.push(`aliases: ${insErr.message}`); }
      }
    }
  }

  if (Array.isArray(body.softwareSlugs) || Array.isArray(body.customSoftware)) {
    const { error: delErr } = await supabase.from("candidate_software").delete().eq("candidate_id", authData.user.id);
    if (delErr) { console.error("[profile] software delete failed:", delErr); warnings.push(`software: ${delErr.message}`); }
    const customLabels: string[] = (body.customSoftware ?? []).filter((s: string) => s.trim());

    // Create tag rows for any custom software entries that don't already
    // exist, marked is_user_submitted, then attach by id same as presets.
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
        const { data: newTag, error: tagErr } = await supabase
          .from("software_tags")
          .insert({ slug, label: label.trim(), is_user_submitted: true })
          .select("id")
          .single();
        if (tagErr) { console.error("[profile] custom software tag insert failed:", tagErr); warnings.push(`software "${label}": ${tagErr.message}`); }
        if (newTag) customTagIds.push(newTag.id);
      }
    }

    const presetSlugs: string[] = body.softwareSlugs ?? [];
    const { data: presetRows } = presetSlugs.length
      ? await supabase.from("software_tags").select("id, slug").in("slug", presetSlugs)
      : { data: [] };

    const allTagIds = [...(presetRows ?? []).map((r) => r.id), ...customTagIds];
    if (allTagIds.length > 0) {
      const { error: insErr } = await supabase.from("candidate_software").insert(
        allTagIds.map((tagId) => ({ candidate_id: authData.user.id, tag_id: tagId }))
      );
      if (insErr) { console.error("[profile] software insert failed:", insErr); warnings.push(`software: ${insErr.message}`); }
    }
  }

  if (Array.isArray(body.dealbreakerSlugs) || Array.isArray(body.customDealbreakers)) {
    const { error: delErr } = await supabase.from("candidate_dealbreakers").delete().eq("candidate_id", authData.user.id);
    if (delErr) { console.error("[profile] dealbreaker delete failed:", delErr); warnings.push(`dealbreakers: ${delErr.message}`); }
    const customLabels: string[] = (body.customDealbreakers ?? []).filter((s: string) => s.trim());

    const customTagIds: number[] = [];
    for (const label of customLabels) {
      const slug = label.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_");
      const { data: existingTag } = await supabase
        .from("dealbreaker_tags")
        .select("id")
        .eq("slug", slug)
        .maybeSingle();
      if (existingTag) {
        customTagIds.push(existingTag.id);
      } else {
        const { data: newTag, error: tagErr } = await supabase
          .from("dealbreaker_tags")
          .insert({ slug, label: label.trim(), is_user_submitted: true })
          .select("id")
          .single();
        if (tagErr) { console.error("[profile] custom dealbreaker tag insert failed:", tagErr); warnings.push(`dealbreakers "${label}": ${tagErr.message}`); }
        if (newTag) customTagIds.push(newTag.id);
      }
    }

    const presetSlugs: string[] = body.dealbreakerSlugs ?? [];
    const { data: presetRows } = presetSlugs.length
      ? await supabase.from("dealbreaker_tags").select("id, slug").in("slug", presetSlugs)
      : { data: [] };

    const allTagIds = [...(presetRows ?? []).map((r) => r.id), ...customTagIds];
    if (allTagIds.length > 0) {
      const { error: insErr } = await supabase.from("candidate_dealbreakers").insert(
        allTagIds.map((tagId) => ({ candidate_id: authData.user.id, tag_id: tagId }))
      );
      if (insErr) { console.error("[profile] dealbreaker insert failed:", insErr); warnings.push(`dealbreakers: ${insErr.message}`); }
    }
  }

  if (Array.isArray(body.workHistory)) {
    const { error: delErr } = await supabase.from("candidate_work_history").delete().eq("candidate_id", authData.user.id);
    if (delErr) { console.error("[profile] work history delete failed:", delErr); warnings.push(`work history: ${delErr.message}`); }
    if (body.workHistory.length > 0) {
      const rowsToInsert = body.workHistory.map(
        (w: { employerName: string; roleTitle?: string; companyWebsite?: string; startDate?: string; endDate?: string }, i: number) => ({
          candidate_id: authData.user.id,
          employer_name: w.employerName,
          role_title: w.roleTitle || null,
          company_website: w.companyWebsite || null,
          start_date: w.startDate || null,
          end_date: w.endDate || null,
          sort_order: i,
        })
      );
      console.log("[profile] inserting work history rows:", JSON.stringify(rowsToInsert));
      const { error: insErr } = await supabase.from("candidate_work_history").insert(rowsToInsert);
      if (insErr) {
        console.error("[profile] work history insert failed:", insErr);
        warnings.push(`work history: ${insErr.message}`);
      }
    }
  }

  if (Array.isArray(body.availability)) {
    const { error: delErr } = await supabase.from("candidate_availability").delete().eq("candidate_id", authData.user.id);
    if (delErr) { console.error("[profile] availability delete failed:", delErr); warnings.push(`availability: ${delErr.message}`); }
    if (body.availability.length > 0) {
      const { error: insErr } = await supabase.from("candidate_availability").insert(
        body.availability.map((a: { day: number; startTime: string; endTime: string }) => ({
          candidate_id: authData.user.id,
          day_of_week: a.day,
          start_time: a.startTime,
          end_time: a.endTime,
        }))
      );
      if (insErr) { console.error("[profile] availability insert failed:", insErr); warnings.push(`availability: ${insErr.message}`); }
    }
  }

  // Check saved match alerts whenever this save either sets the
  // candidate to actively_looking (the primary "just joined" case,
  // since onboarding completion writes visibilityStatus), or touches
  // fields that could newly satisfy an alert they didn't match before
  // (role, software, dealbreakers, availability -- all handled above).
  // Not run on every unrelated single-field edit (e.g. changing a bio
  // text field) to avoid unnecessary work.
  const matchRelevantFieldsTouched =
    body.visibilityStatus === "actively_looking" ||
    primaryRoleId !== undefined ||
    Array.isArray(body.softwareSlugs) ||
    Array.isArray(body.customSoftware) ||
    Array.isArray(body.dealbreakerSlugs) ||
    Array.isArray(body.availability) ||
    body.city !== undefined ||
    body.state !== undefined ||
    body.zip !== undefined ||
    body.payMin !== undefined ||
    body.payMax !== undefined ||
    body.yearsExperience !== undefined ||
    body.openToRelocation !== undefined ||
    body.openToRemote !== undefined;

  if (matchRelevantFieldsTouched) {
    try {
      await checkMatchAlertsForCandidate(createServiceClient(), authData.user.id);
    } catch (err) {
      console.error("[/api/candidate/profile] match alert check failed:", err);
    }
  }

  // Regenerate AI skill chips (profile redesign, #22) only when
  // content that would actually change the answer was touched --
  // an AI call per save regardless of what changed would be wasteful
  // cost/latency for edits (e.g. changing a phone-visible bio line)
  // that have no bearing on what the chips summarize.
  const chipRelevantFieldsTouched =
    Array.isArray(body.softwareSlugs) ||
    Array.isArray(body.customSoftware) ||
    body.skills !== undefined ||
    body.certifications !== undefined ||
    body.ceCourses !== undefined ||
    body.valueAddText !== undefined ||
    body.yearsExperience !== undefined ||
    body.openToRelocation !== undefined ||
    body.openToRemote !== undefined;

  if (chipRelevantFieldsTouched) {
    try {
      const service = createServiceClient();
      const { data: fresh } = await service
        .from("candidate_profiles")
        .select(
          `skills, certifications, ce_courses, years_experience, value_add_text,
           open_to_relocation, open_to_remote,
           software:candidate_software(software_tags(slug))`
        )
        .eq("id", authData.user.id)
        .single();

      if (fresh) {
        const chips = await generateSkillChips({
          skills: fresh.skills ?? [],
          software: ((fresh.software ?? []) as unknown as { software_tags: { slug: string } }[]).map(
            (s) => s.software_tags.slug
          ),
          certifications: fresh.certifications ?? [],
          ceCourses: fresh.ce_courses ?? [],
          yearsExperience: fresh.years_experience,
          valueAddText: fresh.value_add_text,
          openToRelocation: fresh.open_to_relocation ?? false,
          openToRemote: fresh.open_to_remote ?? false,
        });
        await service
          .from("candidate_profiles")
          .update({ ai_skill_chips: chips, ai_skill_chips_generated_at: new Date().toISOString() })
          .eq("id", authData.user.id);
      }
    } catch (err) {
      // Never let a chip-generation failure affect the profile save
      // response -- the save itself already succeeded above.
      console.error("[/api/candidate/profile] skill chip generation failed:", err);
    }
  }

  return NextResponse.json({ success: true, warnings: warnings.length > 0 ? warnings : undefined });
}

function computeCompleteness(profile: Record<string, unknown>): number {
  const fields = [
    "full_name", "primary_role_id", "city", "state", "zip", "employment_types",
    "pay_range_min", "pay_range_max", "years_experience", "value_add_text",
    "future_goals_text", "recovery_scenario_text", "photo_url",
  ];
  const filled = fields.filter((f) => {
    const v = profile[f];
    return v !== undefined && v !== null && v !== "" && !(Array.isArray(v) && v.length === 0);
  });
  return Math.round((filled.length / fields.length) * 100);
}
