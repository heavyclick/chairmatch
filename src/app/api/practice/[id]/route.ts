import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * GET /api/practice/[id]
 *
 * Returns a practice's public-facing profile -- the candidate-facing
 * counterpart to /api/candidate/[id]. There's no blur/paywall logic
 * here, since practice identity (name, photo) was never gated behind
 * a candidate-side subscription -- candidates are always free users
 * and this view exists specifically so they can see what owners see
 * about a practice before/after being contacted.
 */
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

  const { data: practice, error } = await supabase
    .from("practice_profiles")
    .select(
      `practice_name, photo_url, practice_type, specialty, culture_text,
       thrive_text, honest_challenges_text, ideal_staff_text,
       google_review_url, google_rating, google_rating_count,
       locations:practice_locations(city, state),
       software:practice_software(software_tags(*)),
       gallery:practice_gallery_photos(*)`
    )
    .eq("id", id)
    .single();

  if (error || !practice) {
    return NextResponse.json({ error: "Practice not found" }, { status: 404 });
  }

  return NextResponse.json({ practice });
}
