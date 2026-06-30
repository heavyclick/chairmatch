import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * PATCH /api/owner/location
 *
 * Updates the practice's primary location (city + search radius).
 * This is the fix for the bug where the dashboard and browse pages
 * showed different cities -- browse previously had "Houston, TX"
 * hardcoded as a dead string, completely disconnected from this real
 * practice_locations row. Now both pages read AND write this same
 * source of truth.
 */
export async function PATCH(request: NextRequest) {
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const body = await request.json();
  const { city, radiusMiles } = body;

  const { data: existing } = await supabase
    .from("practice_locations")
    .select("id")
    .eq("practice_id", authData.user.id)
    .eq("is_primary", true)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase
      .from("practice_locations")
      .update({ city, radius_miles: radiusMiles })
      .eq("id", existing.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  } else {
    const { error } = await supabase.from("practice_locations").insert({
      practice_id: authData.user.id,
      city,
      radius_miles: radiusMiles,
      is_primary: true,
    });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
