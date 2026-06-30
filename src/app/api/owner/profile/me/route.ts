import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * GET /api/owner/profile/me
 *
 * Returns the current practice's own full profile. Used by the
 * onboarding wizard (to pre-fill when editing) and the owner's own
 * profile self-view dashboard.
 */
export async function GET() {
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { data: profile, error } = await supabase
    .from("practice_profiles")
    .select(
      `*, locations:practice_locations(*), software:practice_software(software_tags(*)),
       gallery:practice_gallery_photos(*)`
    )
    .eq("id", authData.user.id)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ profile });
}
