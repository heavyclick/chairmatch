import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getUser();

  if (!authData.user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { data: practice } = await supabase
    .from("practice_profiles")
    .select("subscription_tier")
    .eq("id", authData.user.id)
    .single();

  const tier = practice?.subscription_tier ?? "free";
  const isUnlocked = tier === "standard" || tier === "pro";

  const { data: candidate, error } = await supabase
    .from("candidate_profiles")
    .select(
      `*, role:roles(*), work_history:candidate_work_history(*),
       dealbreakers:candidate_dealbreakers(dealbreaker_tags(*)),
       software:candidate_software(software_tags(*)),
       alias_tags:candidate_role_aliases(role_aliases(*))`
    )
    .eq("id", id)
    .single();

  if (error || !candidate) {
    return NextResponse.json({ error: "Candidate not found" }, { status: 404 });
  }

  // Same per-practice hiding check as /api/search -- a candidate may
  // have hidden their profile from this specific practice. Checked
  // here too since an owner could otherwise reach a blocked candidate
  // by navigating directly to their detail URL, bypassing the search
  // results list where the block is also enforced.
  const { data: isBlocked } = await supabase
    .from("candidate_practice_blocks")
    .select("candidate_id")
    .eq("candidate_id", id)
    .eq("practice_id", authData.user.id)
    .maybeSingle();
  if (isBlocked) {
    return NextResponse.json({ error: "Candidate not found" }, { status: 404 });
  }

  // Log this view -- powers the candidate's "X practices viewed your
  // profile this week" stat, which previously had no tracking at all
  // and just showed a hardcoded "-" placeholder. Logged here rather
  // than client-side so it can't be skipped/spoofed by not firing a
  // separate tracking call, and so it only counts real detail-page
  // views by an authenticated owner, not card impressions in a list.
  await supabase.from("profile_views").insert({
    candidate_id: id,
    viewer_practice_id: authData.user.id,
  });

  if (!isUnlocked) {
    const { full_name, photo_url, ...rest } = candidate;
    return NextResponse.json({
      candidate: { ...rest, full_name: null, photo_url: null, is_locked: true },
      tier,
    });
  }

  return NextResponse.json({ candidate, tier });
}
