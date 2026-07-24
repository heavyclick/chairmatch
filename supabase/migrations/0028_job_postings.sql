-- Hdenta migration 0028
-- Run AFTER 0027_jobs_add_structured_columns.sql.
--
-- Native job postings: owner-created listings that live on Hdenta
-- rather than being scraped from external boards. Deliberately kept as
-- a SEPARATE table from `jobs` (the scraper target) so:
--   1. RLS is cleaner -- owners write their own rows; scraper rows are
--      service-role-only. Mixing them in one table means one set of
--      policies has to handle both patterns simultaneously.
--   2. The ingest route and its upsert-on-slug logic stay untouched --
--      no risk of a scraper batch accidentally overwriting a native post.
--   3. Schema can evolve independently -- native posts will grow fields
--      (not_a_fit_if, job_applications FK, subscription gate) that make
--      no sense on scraped rows.
--
-- job_postings rows surface in /candidate/browse alongside scraped jobs
-- via a UNION in the server component, both mapped to the shared Job
-- interface in src/components/candidate/job-card.tsx.

create table public.job_postings (
  id            uuid primary key default gen_random_uuid(),
  owner_id      uuid not null references public.practice_profiles(id) on delete cascade,

  -- Human-readable URL slug. Generated server-side from title +
  -- practice name + random suffix; unique across the table so
  -- /jobs/[slug] can serve native posts from the same route that
  -- serves scraped ones (source_type distinguishes them).
  slug          text unique not null,

  title         text not null,
  role_id       integer references public.roles(id) on delete set null,
  employment_type text check (employment_type in ('full_time', 'part_time', 'temp', 'contract')),

  -- Location -- pre-filled from practice profile at creation time,
  -- editable per-posting so a DSO can post for a specific location.
  city          text,
  state         text,
  zip           text,

  -- Compensation
  pay_min       numeric,
  pay_max       numeric,
  pay_unit      text check (pay_unit in ('hour', 'year')),

  -- Content
  description   text,
  requirements  jsonb default '[]'::jsonb,  -- string[]
  benefits      jsonb default '[]'::jsonb,  -- string[]

  -- The "this role isn't a fit if..." field -- freeform owner-written
  -- or AI-drafted. Stored as plain text; rendered verbatim on the
  -- job detail page with a clear framing header.
  not_a_fit_if  text,

  -- Lifecycle
  status        text not null default 'draft'
                  check (status in ('draft', 'active', 'paused', 'expired')),
  -- Expires 30 days after activation. Reset on reactivation. The
  -- nightly expire-jobs cron (api/cron/expire-jobs) reads this.
  expires_at    timestamptz,

  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);

-- Indexes for the /candidate/browse query and owner dashboard queries.
create index idx_job_postings_owner_id    on public.job_postings (owner_id);
create index idx_job_postings_status      on public.job_postings (status);
create index idx_job_postings_state       on public.job_postings (state);
create index idx_job_postings_role_id     on public.job_postings (role_id);
-- Candidate browse orders active native posts by created_at desc.
create index idx_job_postings_active_date on public.job_postings (status, created_at desc);

alter table public.job_postings enable row level security;

-- Owners can fully manage their own postings.
create policy "Owners manage own job postings"
  on public.job_postings for all
  using (auth.uid() = owner_id);

-- Candidates and anon can read active postings only.
create policy "Anyone can read active job postings"
  on public.job_postings for select
  using (status = 'active');


-- ── job_applications ──────────────────────────────────────────────────────────
-- One row per (candidate, job_posting) pair. A unique constraint
-- prevents double-applying; the route checks it explicitly and returns
-- a clear error so the UI can show "Already applied."

create table public.job_applications (
  id               uuid primary key default gen_random_uuid(),
  job_posting_id   uuid not null references public.job_postings(id) on delete cascade,
  applicant_id     uuid not null references public.candidate_profiles(id) on delete cascade,

  -- Optional freeform note from the candidate at apply time.
  cover_note       text,

  -- Owner-managed status. Candidates can see their own status
  -- (to show "Reviewed", "Hired", etc. in their dashboard).
  status           text not null default 'pending'
                     check (status in ('pending', 'reviewed', 'hired', 'rejected')),

  -- The message thread opened (or reused) when this application was
  -- submitted. NULL until the first message is sent; the apply route
  -- creates the thread immediately so owner and candidate can message
  -- right away without a separate "start conversation" step.
  message_thread_id uuid references public.message_threads(id) on delete set null,

  created_at       timestamptz default now(),

  -- One application per candidate per posting. The route also checks
  -- this before inserting to surface a clean error, but the constraint
  -- is the authoritative guard.
  unique (job_posting_id, applicant_id)
);

create index idx_job_applications_posting   on public.job_applications (job_posting_id);
create index idx_job_applications_applicant on public.job_applications (applicant_id);
create index idx_job_applications_status    on public.job_applications (status);

alter table public.job_applications enable row level security;

-- Candidates can insert their own applications and read their own rows.
create policy "Candidates can apply"
  on public.job_applications for insert
  to authenticated
  with check (auth.uid() = applicant_id);

create policy "Candidates read own applications"
  on public.job_applications for select
  using (auth.uid() = applicant_id);

-- Owners can read and update status on applications for their postings.
create policy "Owners read applications for own postings"
  on public.job_applications for select
  using (
    exists (
      select 1 from public.job_postings jp
      where jp.id = job_posting_id and jp.owner_id = auth.uid()
    )
  );

create policy "Owners update application status"
  on public.job_applications for update
  using (
    exists (
      select 1 from public.job_postings jp
      where jp.id = job_posting_id and jp.owner_id = auth.uid()
    )
  );


-- ── Subscription gate on practice_profiles ───────────────────────────────────
-- $50/month unlimited posting. Active = can create and publish postings.
-- Flipped by the LemonSqueezy webhook handler when subscription events
-- arrive. When it goes false, the API route pauses (not deletes) all
-- the practice's active postings so their work is preserved for
-- reactivation.

alter table public.practice_profiles
  add column if not exists job_posting_subscription_active boolean default false,
  add column if not exists job_posting_subscription_started_at timestamptz;
