-- Hdenta migration 0025
-- Run AFTER 0024_new_dealbreakers_and_missing_seed_fix.sql.
--
-- Adds two new practice_profiles fields requested for owner onboarding:
-- a practice website link (additive to the existing optional Google
-- review link, not a replacement -- they serve different purposes,
-- one shows a rating, the other shows the practice's own site), and a
-- benefits list (vacation, bonuses, holidays, etc.) shown on the
-- practice's public profile.
alter table public.practice_profiles
  add column if not exists website_url text,
  add column if not exists benefits text[] default '{}';
