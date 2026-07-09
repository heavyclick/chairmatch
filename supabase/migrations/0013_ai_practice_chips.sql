-- ============================================================
-- AI-generated standout chips for practice profiles -- mirrors
-- candidate_profiles.ai_skill_chips (migration 0012) built for the
-- candidate side of the #22 profile redesign. Inferred from a
-- practice's culture/thrive text, specialty, and software, so a
-- candidate browsing practices gets the same kind of "what makes this
-- one distinctive" signal candidates already show to owners.
--
-- Cached rather than generated per page view, same reasoning as
-- 0012: an AI call has real cost/latency and a practice's standout
-- traits don't change between page loads, only when profile content
-- that would actually change the answer is saved.
-- ============================================================
alter table public.practice_profiles
  add column if not exists ai_practice_chips text[],
  add column if not exists ai_practice_chips_generated_at timestamptz;
