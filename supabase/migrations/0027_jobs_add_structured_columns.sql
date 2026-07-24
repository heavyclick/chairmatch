-- Hdenta migration 0027
-- Run AFTER 0026_jobs_table.sql.
--
-- THIS MIGRATION HAS ALREADY BEEN APPLIED DIRECTLY IN SUPABASE.
-- This file exists solely so the migration history in the repo stays
-- in sync with what's actually live in the database.
--
-- Adds structured columns that the ingest route (api/jobs/ingest)
-- already writes but that were missing from the original 0026 schema:
--
--   source_type       — 'internal' (Hdenta-native) vs 'external' (scraped)
--   description_clean — plain-text version of description, HTML stripped
--   role_category     — normalized role slug matching our roles taxonomy
--   expires_at        — for staleness pruning beyond the 30-day posted_date rule
--   updated_at        — tracks when an upsert last touched this row
--
-- Also adds composite indexes for the /candidate/browse filter queries.

alter table public.jobs
  add column if not exists source_type text not null default 'external'
    check (source_type in ('internal', 'external'));

alter table public.jobs
  add column if not exists description_clean text;

alter table public.jobs
  add column if not exists role_category text;

alter table public.jobs
  add column if not exists expires_at timestamptz;

alter table public.jobs
  add column if not exists updated_at timestamptz default now();

create index if not exists idx_jobs_source_type    on public.jobs (source_type);
create index if not exists idx_jobs_state_source   on public.jobs (state, source_type);
create index if not exists idx_jobs_role_category  on public.jobs (role_category);
create index if not exists idx_jobs_posted_date    on public.jobs (posted_date desc nulls last);

-- RLS: add public/authenticated read policies if they don't exist yet.
-- The original 0026 migration added "Anyone can read active jobs" (anon
-- only); this ensures the authenticated role can also read, which is
-- required for /candidate/browse (always runs inside an authenticated
-- session).
do $$
begin
  if not exists (
    select 1 from pg_policies
    where tablename = 'jobs' and policyname = 'Public can read jobs'
  ) then
    execute 'create policy "Public can read jobs" on public.jobs for select to anon using (true)';
  end if;

  if not exists (
    select 1 from pg_policies
    where tablename = 'jobs' and policyname = 'Authenticated users can read jobs'
  ) then
    execute 'create policy "Authenticated users can read jobs" on public.jobs for select to authenticated using (true)';
  end if;
end $$;

-- Backfill: existing rows are all external scraped jobs.
update public.jobs set source_type = 'external' where source_type is null;
