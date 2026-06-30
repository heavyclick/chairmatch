import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

/**
 * POST /api/reviews/submit
 *
 * Public, unauthenticated review submission -- a patient or coworker
 * leaving a review has no Supabase session at all, so this route uses
 * the service-role client rather than the normal user-scoped one.
 *
 * Abuse controls, per founder decision (light-touch, not full email
 * verification): name + email captured but not verified via a click
 * link, one review per reviewer-email per candidate enforced by the
 * unique constraint on candidate_reviews(candidate_id, reviewer_email)
 * in migration 0003, plus a basic per-IP rate limit here. This is
 * intentionally NOT bulletproof -- it's calibrated to deter casual
 * abuse without adding enough friction to kill genuine review volume,
 * per the explicit tradeoff discussed with the founder.
 */

// Extremely simple in-memory rate limit -- resets on server restart
// and doesn't share state across multiple server instances. Fine for
// an early-stage deployment on a single instance; replace with a real
// rate-limit store (Redis, Upstash, etc.) before scaling traffic.
const recentSubmissions = new Map<string, number[]>();
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000; // 1 hour
const RATE_LIMIT_MAX = 5; // 5 review submissions per IP per hour

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const timestamps = (recentSubmissions.get(ip) ?? []).filter((t) => now - t < RATE_LIMIT_WINDOW_MS);
  timestamps.push(now);
  recentSubmissions.set(ip, timestamps);
  return timestamps.length > RATE_LIMIT_MAX;
}

export async function POST(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  if (isRateLimited(ip)) {
    return NextResponse.json(
      { error: "Too many reviews submitted recently. Please try again later." },
      { status: 429 }
    );
  }

  const body = await request.json();
  const { candidateId, reviewerName, reviewerEmail, rating, reviewText } = body;

  if (!candidateId || !reviewerName?.trim() || !reviewerEmail?.trim()) {
    return NextResponse.json({ error: "Name and email are required." }, { status: 400 });
  }
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return NextResponse.json({ error: "Rating must be between 1 and 5." }, { status: 400 });
  }
  // Minimal email shape check -- not exhaustive validation, just
  // enough to reject obvious garbage input.
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(reviewerEmail.trim())) {
    return NextResponse.json({ error: "Please enter a valid email." }, { status: 400 });
  }

  const supabase = createServiceClient();

  const { data: candidate } = await supabase
    .from("candidate_profiles")
    .select("id")
    .eq("id", candidateId)
    .maybeSingle();
  if (!candidate) {
    return NextResponse.json({ error: "Candidate not found." }, { status: 404 });
  }

  const { error } = await supabase.from("candidate_reviews").insert({
    candidate_id: candidateId,
    reviewer_name: reviewerName.trim(),
    reviewer_email: reviewerEmail.trim().toLowerCase(),
    rating,
    review_text: reviewText?.trim() || null,
  });

  if (error) {
    // unique_violation on (candidate_id, reviewer_email) -- this
    // person already reviewed this candidate.
    if (error.code === "23505") {
      return NextResponse.json(
        { error: "You've already left a review for this person." },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
