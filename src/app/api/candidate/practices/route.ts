import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * GET /api/candidate/practices
 *
 * Candidate-side practice browsing -- separate from the owner-side
 * /api/search (which finds candidates). Supports search by name/city/
 * state. No contact action exists on this surface at all (candidates
 * browse, they don't reach out -- that's the owner's job, this is
 * purely informational/research for the candidate).
 */
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const name = searchParams.get("name");
  const city = searchParams.get("city");
  const state = searchParams.get("state");

  let query = supabase
    .from("practice_profiles")
    .select(
      `id, practice_name, photo_url, specialty, culture_text, thrive_text,
       google_rating, google_rating_count,
       locations:practice_locations(city, state)`
    )
    .limit(30);

  if (name) query = query.ilike("practice_name", `%${name}%`);

  const { data: practices, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  let filtered = practices ?? [];
  if (city || state) {
    filtered = filtered.filter((p) => {
      const locs = Array.isArray(p.locations) ? p.locations : p.locations ? [p.locations] : [];
      return locs.some(
        (l) =>
          (!city || l.city?.toLowerCase().includes(city.toLowerCase())) &&
          (!state || l.state === state)
      );
    });
  }

  return NextResponse.json({ results: filtered });
}
