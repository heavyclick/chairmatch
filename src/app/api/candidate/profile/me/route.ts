import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * GET /api/candidate/profile/me
 *
 * Returns the current candidate's own full profile (unblurred --
 * they're looking at their own data, the paywall blur logic in
 * /api/search and /api/candidate/[id] is about OTHER people viewing
 * a candidate, not self-view). Used by:
 * - The onboarding wizard, to pre-fill fields when editing an existing
 *   profile rather than presenting an empty form.
 * - The candidate's own self-view dashboard (/candidate/profile),
 *   which shows them exactly what an owner would see.
 */
export async function GET() {
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { data: profile, error } = await supabase
    .from("candidate_profiles")
    .select(
      `*, role:roles(*), work_history:candidate_work_history(*),
       dealbreakers:candidate_dealbreakers(dealbreaker_tags(*)),
       software:candidate_software(software_tags(*)),
       alias_tags:candidate_role_aliases(role_aliases(*)),
       availability:candidate_availability(*)`
    )
    .eq("id", authData.user.id)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ profile });
}
