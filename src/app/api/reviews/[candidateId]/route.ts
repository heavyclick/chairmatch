import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

/**
 * GET /api/reviews/[candidateId]
 *
 * Public, unauthenticated read of a candidate's VISIBLE reviews plus
 * basic profile info needed to render the public-facing review page
 * (name, role, photo) -- no Supabase session required. Uses the
 * service-role client specifically so this works for a logged-out
 * visitor; the RLS policy on candidate_reviews already restricts
 * results to is_visible = true regardless, but a logged-out request
 * has no auth.uid() at all to evaluate the candidate's own "see
 * everything" policy against, so the public client would just return
 * nothing useful without an explicit anon-safe path.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ candidateId: string }> }
) {
  const { candidateId } = await params;
  const supabase = createServiceClient();

  const { data: candidate, error: candidateError } = await supabase
    .from("candidate_profiles")
    .select("id, full_name, photo_url, city, state, role:roles(label)")
    .eq("id", candidateId)
    .maybeSingle();

  if (candidateError || !candidate) {
    return NextResponse.json({ error: "Profile not found." }, { status: 404 });
  }

  const { data: reviews, error: reviewsError } = await supabase
    .from("candidate_reviews")
    .select("id, reviewer_name, rating, review_text, created_at")
    .eq("candidate_id", candidateId)
    .eq("is_visible", true)
    .order("created_at", { ascending: false });

  if (reviewsError) {
    return NextResponse.json({ error: reviewsError.message }, { status: 500 });
  }

  const averageRating = reviews.length
    ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
    : null;

  return NextResponse.json({
    candidate,
    reviews,
    averageRating,
    reviewCount: reviews.length,
  });
}
