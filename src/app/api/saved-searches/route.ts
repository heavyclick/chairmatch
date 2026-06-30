import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("saved_searches")
    .select("*, role:roles(label)")
    .eq("owner_id", authData.user.id)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // new_match_count would normally come from comparing the search's
  // filters against candidates created/updated after last_viewed_at --
  // deferred until /api/search supports a "matches saved search X"
  // mode. For now this returns 0 rather than a fake number.
  const withCounts = (data ?? []).map((s) => ({ ...s, new_match_count: 0 }));

  return NextResponse.json({ results: withCounts });
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const body = await request.json();
  const { error } = await supabase.from("saved_searches").insert({
    owner_id: authData.user.id,
    label: body.label,
    role_id: body.roleId,
    employment_type: body.employmentType,
    pay_min: body.payMin,
    pay_max: body.payMax,
    distance_miles: body.distanceMiles,
    min_years_experience: body.minYearsExperience,
    open_to_relocation_only: body.openToRelocationOnly ?? false,
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
