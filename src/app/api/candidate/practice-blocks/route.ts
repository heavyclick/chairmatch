import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * GET /api/candidate/practice-blocks -- list practices this candidate
 *   has hidden their profile from.
 * POST -- hide from a specific practice (e.g. "hide me from my
 *   current employer"). Distinct from visibility_status, which is
 *   all-or-nothing -- this is a per-practice exception.
 * DELETE -- unhide from a specific practice (via ?practiceId=).
 */
export async function GET() {
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("candidate_practice_blocks")
    .select("practice_id, created_at, practice:practice_profiles(practice_name)")
    .eq("candidate_id", authData.user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ blocks: data });
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { practiceId } = await request.json();
  if (!practiceId) {
    return NextResponse.json({ error: "practiceId is required." }, { status: 400 });
  }

  const { error } = await supabase
    .from("candidate_practice_blocks")
    .upsert({ candidate_id: authData.user.id, practice_id: practiceId });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}

export async function DELETE(request: NextRequest) {
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const practiceId = new URL(request.url).searchParams.get("practiceId");
  if (!practiceId) {
    return NextResponse.json({ error: "practiceId is required." }, { status: 400 });
  }

  const { error } = await supabase
    .from("candidate_practice_blocks")
    .delete()
    .eq("candidate_id", authData.user.id)
    .eq("practice_id", practiceId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
