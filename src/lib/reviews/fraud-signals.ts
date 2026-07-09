import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

export interface FraudSignals {
  /** Other reviews (for ANY candidate) from the same IP in the trailing 30 days -- a real coworker/patient reviews one person; the same IP reviewing many different candidates in a short window is the classic review-farm pattern. */
  sameIpReviewCountLast30Days: number;
  /** Whether the reviewer's captured city/region roughly matches the candidate's own claimed city/state -- a genuine coworker or patient is very plausibly nearby; a review from somewhere else isn't proof of fraud (remote hires, relocations exist) but is worth a human's attention. */
  locationRoughlyMatchesCandidate: boolean | null; // null = insufficient location data to compare
  /** This review predates the Turnstile requirement, or Turnstile verification wasn't recorded for it. Not itself suspicious for older reviews -- flagged separately so a moderator can tell "before we required this" apart from "bypassed it somehow." */
  submittedWithoutVerifiedCaptcha: boolean;
  /** Reviewer's email domain is a well-known disposable/temporary-email provider -- doesn't prove fraud (privacy-conscious real reviewers exist) but is a real, checkable signal worth surfacing. */
  usesDisposableEmailDomain: boolean;
}

// Small, well-known set -- not exhaustive (new disposable-email domains
// appear constantly), just enough to catch the most common ones without
// taking a dependency on a third-party disposable-email-detection API.
const DISPOSABLE_EMAIL_DOMAINS = new Set([
  "mailinator.com",
  "guerrillamail.com",
  "10minutemail.com",
  "tempmail.com",
  "temp-mail.org",
  "throwawaymail.com",
  "yopmail.com",
]);

/**
 * Builds the fraud-signal portion of a flag's evidence packet. This is
 * information FOR a human moderator to weigh, not a verdict -- per the
 * earlier design decision, automated fake-vs-real determination would
 * false-positive on real disgruntled reviewers. No admin UI exists yet
 * (see README) to act on this automatically; it's stored so whichever
 * review process eventually reads candidate_review_flags.evidence
 * (currently: manually via Supabase's table editor with the
 * service-role key) has real signal to work from instead of just the
 * flagger's own account of what happened.
 */
export async function computeFraudSignals(
  supabase: SupabaseClient<Database>,
  review: {
    reviewer_ip: string | null;
    reviewer_city: string | null;
    reviewer_region: string | null;
    reviewer_email: string;
    turnstile_verified: boolean | null;
    created_at: string;
  },
  candidateId: string
): Promise<FraudSignals> {
  let sameIpReviewCountLast30Days = 0;
  if (review.reviewer_ip && review.reviewer_ip !== "unknown") {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const { count } = await supabase
      .from("candidate_reviews")
      .select("id", { count: "exact", head: true })
      .eq("reviewer_ip", review.reviewer_ip)
      .gte("created_at", thirtyDaysAgo);
    sameIpReviewCountLast30Days = count ?? 0;
  }

  let locationRoughlyMatchesCandidate: boolean | null = null;
  if (review.reviewer_city || review.reviewer_region) {
    const { data: candidate } = await supabase
      .from("candidate_profiles")
      .select("city, state")
      .eq("id", candidateId)
      .single();
    if (candidate?.city || candidate?.state) {
      const reviewerLocation = `${review.reviewer_city ?? ""} ${review.reviewer_region ?? ""}`.toLowerCase();
      const candidateLocation = `${candidate.city ?? ""} ${candidate.state ?? ""}`.toLowerCase();
      locationRoughlyMatchesCandidate =
        (!!candidate.city && reviewerLocation.includes(candidate.city.toLowerCase())) ||
        (!!candidate.state && reviewerLocation.includes(candidate.state.toLowerCase())) ||
        candidateLocation.trim() === "";
    }
  }

  const emailDomain = review.reviewer_email.split("@")[1]?.toLowerCase();

  return {
    sameIpReviewCountLast30Days,
    locationRoughlyMatchesCandidate,
    submittedWithoutVerifiedCaptcha: review.turnstile_verified !== true,
    usesDisposableEmailDomain: emailDomain ? DISPOSABLE_EMAIL_DOMAINS.has(emailDomain) : false,
  };
}
