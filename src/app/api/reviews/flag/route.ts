import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { computeFraudSignals } from "@/lib/reviews/fraud-signals";

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
 *
 * Also builds a full evidence packet (migration 0008) -- the review's
 * captured signals (IP, geo, device, CAPTCHA status) plus computed
 * fraud-pattern signals -- stored on the flag itself so it survives
 * even if the review is later edited/removed, and so whoever reviews
 * the flag has real signal to work from instead of just the flagger's
 * account of what happened.
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
  // reviews. Deliberately checked on the user-scoped client (not
  // service-role) so this ownership check is still subject to normal
  // RLS -- only reviewer_id/candidate_id are read here, not the PII
  // columns, so the column-level revoke in migration 0008 doesn't
  // affect this query at all.
  const { data: review } = await supabase
    .from("candidate_reviews")
    .select("id, candidate_id")
    .eq("id", reviewId)
    .single();

  if (!review || review.candidate_id !== authData.user.id) {
    return NextResponse.json({ error: "Review not found." }, { status: 404 });
  }

  // Everything from here on needs the service-role client -- both to
  // read the PII columns revoked from `authenticated` in migration
  // 0008, and to write candidate_reviews.reviewer_ip-adjacent data
  // into the evidence packet.
  const service = createServiceClient();

  const { data: fullReview } = await service
    .from("candidate_reviews")
    .select(
      "reviewer_email, reviewer_ip, reviewer_country, reviewer_region, reviewer_city, reviewer_latitude, reviewer_longitude, reviewer_user_agent, reviewer_browser, reviewer_os, reviewer_device_type, reviewer_language, turnstile_verified, created_at"
    )
    .eq("id", reviewId)
    .single();

  let evidence: Record<string, unknown> = { flaggerReason: reason.trim() };
  if (fullReview) {
    const fraudSignals = await computeFraudSignals(service, fullReview, authData.user.id);
    evidence = {
      flaggerReason: reason.trim(),
      capturedAtSubmission: {
        ip: fullReview.reviewer_ip,
        country: fullReview.reviewer_country,
        region: fullReview.reviewer_region,
        city: fullReview.reviewer_city,
        latitude: fullReview.reviewer_latitude,
        longitude: fullReview.reviewer_longitude,
        userAgent: fullReview.reviewer_user_agent,
        browser: fullReview.reviewer_browser,
        os: fullReview.reviewer_os,
        deviceType: fullReview.reviewer_device_type,
        language: fullReview.reviewer_language,
        turnstileVerified: fullReview.turnstile_verified,
      },
      fraudSignals,
    };
  }

  const { error: flagError } = await service.from("candidate_review_flags").insert({
    review_id: reviewId,
    flagged_by_candidate_id: authData.user.id,
    reason: reason.trim(),
    evidence,
  });
  if (flagError) {
    return NextResponse.json({ error: flagError.message }, { status: 500 });
  }

  await service.from("candidate_reviews").update({ is_visible: false }).eq("id", reviewId);

  return NextResponse.json({ success: true });
}
