import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

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

    const { error: upsertError } = await supabase.from("candidate_profiles").upsert(update);
    if (upsertError) {
      return NextResponse.json({ error: upsertError.message }, { status: 500 });
    }
  }

  // ---- join tables: only touched if their key is present in the request ----
  if (Array.isArray(body.aliasSlugs)) {
    await supabase.from("candidate_role_aliases").delete().eq("candidate_id", authData.user.id);
    if (body.aliasSlugs.length > 0) {
      const { data: rows } = await supabase.from("role_aliases").select("id, slug").in("slug", body.aliasSlugs);
      if (rows?.length) {
        await supabase.from("candidate_role_aliases").insert(
          rows.map((a) => ({ candidate_id: authData.user.id, alias_id: a.id }))
        );
      }
    }
  }

  if (Array.isArray(body.softwareSlugs) || Array.isArray(body.customSoftware)) {
    await supabase.from("candidate_software").delete().eq("candidate_id", authData.user.id);
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
      await supabase.from("candidate_software").insert(
        allTagIds.map((tagId) => ({ candidate_id: authData.user.id, tag_id: tagId }))
      );
    }
  }

  if (Array.isArray(body.dealbreakerSlugs) || Array.isArray(body.customDealbreakers)) {
    await supabase.from("candidate_dealbreakers").delete().eq("candidate_id", authData.user.id);
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
        const { data: newTag } = await supabase
          .from("dealbreaker_tags")
          .insert({ slug, label: label.trim(), is_user_submitted: true })
          .select("id")
          .single();
        if (newTag) customTagIds.push(newTag.id);
      }
    }

    const presetSlugs: string[] = body.dealbreakerSlugs ?? [];
    const { data: presetRows } = presetSlugs.length
      ? await supabase.from("dealbreaker_tags").select("id, slug").in("slug", presetSlugs)
      : { data: [] };

    const allTagIds = [...(presetRows ?? []).map((r) => r.id), ...customTagIds];
    if (allTagIds.length > 0) {
      await supabase.from("candidate_dealbreakers").insert(
        allTagIds.map((tagId) => ({ candidate_id: authData.user.id, tag_id: tagId }))
      );
    }
  }

  if (Array.isArray(body.workHistory)) {
    await supabase.from("candidate_work_history").delete().eq("candidate_id", authData.user.id);
    if (body.workHistory.length > 0) {
      await supabase.from("candidate_work_history").insert(
        body.workHistory.map((w: { employerName: string; roleTitle?: string; companyWebsite?: string; startDate?: string; endDate?: string }, i: number) => ({
          candidate_id: authData.user.id,
          employer_name: w.employerName,
          role_title: w.roleTitle || null,
          company_website: w.companyWebsite || null,
          start_date: w.startDate || null,
          end_date: w.endDate || null,
          sort_order: i,
        }))
      );
    }
  }

  if (Array.isArray(body.availability)) {
    await supabase.from("candidate_availability").delete().eq("candidate_id", authData.user.id);
    if (body.availability.length > 0) {
      await supabase.from("candidate_availability").insert(
        body.availability.map((a: { day: number; startTime: string; endTime: string }) => ({
          candidate_id: authData.user.id,
          day_of_week: a.day,
          start_time: a.startTime,
          end_time: a.endTime,
        }))
      );
    }
  }

  return NextResponse.json({ success: true });
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
