import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { extractReviewerSignals, verifyTurnstileToken } from "@/lib/reviews/capture-signals";

/**
 * POST /api/reviews/submit
 *
 * Public, unauthenticated review submission -- a patient or coworker
 * leaving a review has no Supabase session at all, so this route uses
 * the service-role client rather than the normal user-scoped one.
 *
 * Abuse controls, current state:
 *   - Cloudflare Turnstile CAPTCHA, verified server-side before
 *     anything is inserted.
 *   - A honeypot field (`website`) -- invisible to real users via CSS,
 *     but visible to naive form-filling bots. Any non-empty value is
 *     treated as a bot and rejected with a generic success-shaped
 *     response (not an error) so as not to teach a bot what tripped it.
 *   - Full reviewer signal capture (IP, coarse geolocation, device/
 *     browser, language -- see src/lib/reviews/capture-signals.ts) for
 *     later fraud-pattern analysis if a review gets flagged, not used
 *     to block submission on its own.
 *   - One review per reviewer-email per candidate (unique constraint,
 *     migration 0003).
 *   - Basic per-IP rate limit below.
 * This is calibrated to meaningfully deter casual/scripted abuse
 * without so much friction it kills genuine review volume -- not
 * claiming to be unbeatable against a determined, resourced attacker.
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
  const signals = extractReviewerSignals(request);

  if (isRateLimited(signals.ip)) {
    return NextResponse.json(
      { error: "Too many reviews submitted recently. Please try again later." },
      { status: 429 }
    );
  }

  const body = await request.json();
  const { candidateId, reviewerName, reviewerEmail, rating, reviewText, turnstileToken, website } = body;

  // Honeypot: `website` is a field real users never see or fill (hidden
  // off-screen in the form, not display:none -- some bots specifically
  // skip display:none fields). Any bot naively filling every input it
  // finds trips this. Returning a success-shaped response rather than
  // an error avoids teaching the bot what tripped it.
  if (typeof website === "string" && website.trim() !== "") {
    return NextResponse.json({ success: true });
  }

  if (!turnstileToken) {
    return NextResponse.json({ error: "Please complete the verification challenge." }, { status: 400 });
  }
  const turnstileVerified = await verifyTurnstileToken(turnstileToken, signals.ip);
  if (!turnstileVerified) {
    return NextResponse.json(
      { error: "Verification failed. Please try again." },
      { status: 400 }
    );
  }

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
    reviewer_ip: signals.ip,
    reviewer_country: signals.country,
    reviewer_region: signals.region,
    reviewer_city: signals.city,
    reviewer_latitude: signals.latitude,
    reviewer_longitude: signals.longitude,
    reviewer_user_agent: signals.userAgent,
    reviewer_browser: signals.browser,
    reviewer_os: signals.os,
    reviewer_device_type: signals.deviceType,
    reviewer_language: signals.language,
    turnstile_verified: turnstileVerified,
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
