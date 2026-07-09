-- ============================================================
-- Real reviewer signal capture for abuse detection -- previously
-- candidate_reviews stored only reviewer_name/reviewer_email with a
-- basic per-IP rate limit and no other signal at all, confirmed by
-- testing: submitting with a fake name and throwaway email succeeded
-- with no friction.
--
-- These columns hold reviewer PII (IP address, coarse geolocation,
-- device/browser fingerprint) -- NOT exposed through the existing
-- public "Anyone can read visible reviews" policy at the application
-- level (every consumer route already selects explicit narrow column
-- lists, not `*` -- verified against every current reader of this
-- table before writing this migration), but RLS is row-level, not
-- column-level, so as defense-in-depth these specific columns are
-- also revoked from the `authenticated` role outright. Only
-- service-role code (the submit route, and the fraud-signal
-- computation at flag time) can ever read or write them.
-- ============================================================
alter table public.candidate_reviews
  add column if not exists reviewer_ip text,
  add column if not exists reviewer_country text,
  add column if not exists reviewer_region text,
  add column if not exists reviewer_city text,
  add column if not exists reviewer_latitude numeric,
  add column if not exists reviewer_longitude numeric,
  add column if not exists reviewer_user_agent text,
  add column if not exists reviewer_browser text,
  add column if not exists reviewer_os text,
  add column if not exists reviewer_device_type text,
  add column if not exists reviewer_language text,
  add column if not exists turnstile_verified boolean default false;

revoke select (
  reviewer_ip,
  reviewer_country,
  reviewer_region,
  reviewer_city,
  reviewer_latitude,
  reviewer_longitude,
  reviewer_user_agent,
  reviewer_browser,
  reviewer_os,
  reviewer_device_type,
  reviewer_language
) on public.candidate_reviews from authenticated;

-- ============================================================
-- Flag evidence packet -- when a candidate flags a review, this
-- captures a full snapshot of the review's signals above plus computed
-- fraud-pattern signals (src/lib/reviews/fraud-signals.ts), so the
-- evidence persists even if the underlying review is later edited or
-- removed, and so whoever reviews the flag doesn't have to
-- reconstruct context by hand.
--
-- This is information for a human moderator, not an automated
-- takedown verdict -- per the earlier design decision, automated
-- fake-vs-real determination would false-positive on real disgruntled
-- reviewers. No admin UI exists yet to act on this (see README) --
-- it's read manually via Supabase's table editor with the service-role
-- key for now. Revoked from `authenticated` for the same PII reason as
-- above -- a candidate should not be able to read the reviewer's IP/
-- geo/device by looking at their own flag record.
-- ============================================================
alter table public.candidate_review_flags
  add column if not exists evidence jsonb;

revoke select (evidence) on public.candidate_review_flags from authenticated;
