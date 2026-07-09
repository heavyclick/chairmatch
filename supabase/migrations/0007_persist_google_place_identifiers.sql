-- ============================================================
-- Persists the exact Google identifiers resolved from a practice's own
-- pasted review URL (src/lib/google-rating/resolve-url.ts), once found.
-- Lets the scheduled re-sync (src/app/api/cron/sync-google-ratings)
-- confirm it's still looking at the exact same listing on every run,
-- rather than re-parsing the URL and re-running a name search from
-- scratch every single time.
-- ============================================================
alter table public.practice_profiles
  add column if not exists google_place_id text,
  add column if not exists google_cid text;
