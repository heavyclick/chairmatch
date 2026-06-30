import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * GET /api/owner/roster -- list candidates this practice has pre-added
 *   to their roster.
 * POST -- add a candidate to the roster (note: only candidates with
 *   allow_roster_add = true can be added -- enforced here, not just
 *   hidden in the UI, since a candidate's opt-out has to actually mean
 *   something).
 * DELETE -- remove via ?candidateId=.
 */
export async function GET() {
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("practice_team_roster")
    .select(
      `id, note, created_at,
       candidate:candidate_profiles(id, full_name, photo_url, city, state, role:roles(label))`
    )
    .eq("practice_id", authData.user.id)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ roster: data });
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { candidateId, note } = await request.json();
  if (!candidateId) {
    return NextResponse.json({ error: "candidateId is required." }, { status: 400 });
  }

  const { data: candidate } = await supabase
    .from("candidate_profiles")
    .select("allow_roster_add")
    .eq("id", candidateId)
    .maybeSingle();

  if (!candidate) {
    return NextResponse.json({ error: "Candidate not found." }, { status: 404 });
  }
  if (!candidate.allow_roster_add) {
    return NextResponse.json(
      { error: "This candidate has opted out of being added to practice rosters." },
      { status: 403 }
    );
  }

  const { error } = await supabase
    .from("practice_team_roster")
    .upsert({ practice_id: authData.user.id, candidate_id: candidateId, note: note || null });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}

export async function DELETE(request: NextRequest) {
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const candidateId = new URL(request.url).searchParams.get("candidateId");
  if (!candidateId) {
    return NextResponse.json({ error: "candidateId is required." }, { status: 400 });
  }

  const { error } = await supabase
    .from("practice_team_roster")
    .delete()
    .eq("practice_id", authData.user.id)
    .eq("candidate_id", candidateId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
