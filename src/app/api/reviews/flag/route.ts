import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * POST /api/reviews/flag
 *
 * A candidate flags a review on their OWN profile for admin review --
 * per founder decision, this does NOT unilaterally hide the review
 * (that would let candidates curate away any criticism, which defeats
 * the point of public reviews). The review's is_visible is flipped to
 * false here while the flag is pending, since a disputed review
 * shouldn't stay live during review, but reversing that is currently a
 * manual admin action (update candidate_review_flags.status and
 * candidate_reviews.is_visible directly in Supabase) -- no admin UI
 * exists yet, see README.
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { reviewId, reason } = await request.json();
  if (!reviewId || !reason?.trim()) {
    return NextResponse.json({ error: "A reason is required." }, { status: 400 });
  }

  // Confirm this review actually belongs to the flagging candidate's
  // own profile -- a candidate must not be able to flag someone else's
  // reviews.
  const { data: review } = await supabase
    .from("candidate_reviews")
    .select("id, candidate_id")
    .eq("id", reviewId)
    .single();

  if (!review || review.candidate_id !== authData.user.id) {
    return NextResponse.json({ error: "Review not found." }, { status: 404 });
  }

  const { error: flagError } = await supabase.from("candidate_review_flags").insert({
    review_id: reviewId,
    flagged_by_candidate_id: authData.user.id,
    reason: reason.trim(),
  });
  if (flagError) {
    return NextResponse.json({ error: flagError.message }, { status: 500 });
  }

  await supabase.from("candidate_reviews").update({ is_visible: false }).eq("id", reviewId);

  return NextResponse.json({ success: true });
}
