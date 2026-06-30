import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Candidate-side "notify me when practice X joins" -- symmetric to the
 * owner-side match_alerts, but keyed to a specific named practice the
 * candidate searched for and didn't find, rather than a role/location
 * combination. Sending the actual notification once that practice
 * signs up isn't implemented yet (would need to check new
 * practice_profiles rows against candidate_practice_watch entries on
 * signup) -- this route only registers the watch request.
 */
export async function GET() {
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("candidate_practice_watch")
    .select("*")
    .eq("candidate_id", authData.user.id)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ watches: data });
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { practiceNameQuery, city, state } = await request.json();
  if (!practiceNameQuery?.trim()) {
    return NextResponse.json({ error: "A practice name is required." }, { status: 400 });
  }

  const { error } = await supabase.from("candidate_practice_watch").insert({
    candidate_id: authData.user.id,
    practice_name_query: practiceNameQuery.trim(),
    city: city || null,
    state: state || null,
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
