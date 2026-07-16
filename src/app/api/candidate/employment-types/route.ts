import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * POST /api/candidate/employment-types
 *
 * Previously the only way to change "open to part-time" / "open to
 * temp" etc. was to go back through the full onboarding flow -- there
 * was no quick way to update it from the dashboard, even though this
 * is exactly the kind of thing that changes on short notice (someone
 * suddenly open to temp work, or no longer wanting part-time). Mirrors
 * src/app/api/candidate/status/route.ts's plain-form-POST pattern
 * (checkboxes, not a client-side fetch), just accepting multiple
 * values since employment type is a set, not a single choice.
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getUser();

  if (!authData.user) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const formData = await request.formData();
  const selected = formData
    .getAll("employment_types")
    .map((v) => v.toString())
    .filter((v) => ["full_time", "part_time", "temp"].includes(v));

  await supabase
    .from("candidate_profiles")
    .update({ employment_types: selected })
    .eq("id", authData.user.id);

  return NextResponse.redirect(new URL("/candidate/dashboard", request.url));
}
