-- ============================================================
-- AI-generated skill/feature chips (profile redesign, #22) -- a short,
-- standout summary of what makes a candidate distinctive, inferred
-- from their structured skills/software/certifications/CE
-- courses/years of experience plus their free-text "what they bring"
-- answer. Cached here rather than generated on every page view: an AI
-- call has real cost and latency, and a candidate's standout traits
-- don't change from one page load to the next -- only regenerated when
-- profile content that would actually change the answer is saved (see
-- src/lib/ai/skill-chips.ts and its call site in
-- /api/candidate/profile).
-- ============================================================
alter table public.candidate_profiles
  add column if not exists ai_skill_chips text[],
  add column if not exists ai_skill_chips_generated_at timestamptz;
