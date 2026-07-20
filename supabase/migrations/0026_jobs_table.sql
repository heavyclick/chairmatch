-- Hdenta migration 0026
-- Run AFTER 0025_practice_website_and_benefits.sql.
--
-- External job aggregation system. A separate scraper service (run
-- independently, outside this codebase) visits external dental job
-- boards daily and POSTs batches to /api/jobs/ingest, which writes
-- here using the service-role client. Nothing about this table is
-- ever written to by anon/authenticated roles -- only read.
create table public.jobs (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  title text not null,
  practice_name text,
  city text,
  state text,
  zip text,
  job_type text,
  pay_min numeric,
  pay_max numeric,
  pay_unit text,
  description text,
  requirements jsonb default '[]',
  benefits jsonb default '[]',
  source_platform text,
  source_url text unique not null,
  posted_date date,
  scraped_at timestamptz,
  status text not null default 'active' check (status in ('active', 'expired')),
  created_at timestamptz default now()
);

create index on public.jobs (state);
create index on public.jobs (city);
create index on public.jobs (title);
create index on public.jobs (job_type);
create index on public.jobs (status);
create index on public.jobs (slug);
-- Browse page orders by scraped_at DESC and almost always filters to
-- status = 'active' at the same time -- a composite index serves that
-- exact query shape directly instead of the planner combining two
-- single-column indexes.
create index on public.jobs (status, scraped_at desc);

alter table public.jobs enable row level security;

-- Public read of active jobs -- Browse Jobs and job detail pages are
-- both public/SEO-indexable by design (that's the whole point of
-- pulling in external listings at this stage: give search-engine
-- traffic and Reddit/Telegram clicks something real to land on).
-- The gate lives on the Apply action at the page level, not on
-- viewing -- see /jobs/[slug]. No insert/update/delete policy for
-- anon/authenticated at all -- the ingest route and the nightly
-- expiry job both use the service-role client, which bypasses RLS
-- entirely.
create policy "Anyone can read active jobs"
  on public.jobs for select
  using (status = 'active');
