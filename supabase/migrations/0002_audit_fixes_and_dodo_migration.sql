-- ChairMatch migration 0002
-- Run AFTER 0001_initial_schema.sql.
--
-- This migration is purely additive/renaming -- it never drops a
-- column outright without first renaming, so it's safe to run even if
-- 0001 has already been applied and has real data in it.

-- ============================================================
-- Payment provider swap: Stripe -> Dodo Payments (temporary, see
-- src/lib/dodo/server.ts for the rationale -- this is expected to be
-- migrated back to Stripe later once business verification is done).
-- ============================================================
alter table public.practice_profiles
  rename column stripe_customer_id to dodo_customer_id;

alter table public.screening_credit_purchases
  rename column stripe_payment_intent_id to dodo_payment_id;

-- ============================================================
-- Candidate profile gaps identified in the production-readiness audit
-- ============================================================
alter table public.candidate_profiles
  add column if not exists hobbies text[] default '{}',
  add column if not exists skills text[] default '{}', -- distinct from software/certifications
  add column if not exists open_to_remote boolean default false,
  add column if not exists collections_percent numeric, -- for associate/collections-based pay
  add column if not exists collections_note text, -- free-text nuance ("30% after lab fees", etc.)
  add column if not exists terms_accepted_at timestamptz,
  add column if not exists marketing_opt_in boolean default false,
  -- "Describe your ideal practice" -- this was explicitly requested in
  -- the very first product conversation and dropped during the initial
  -- build. Adding it back here.
  add column if not exists ideal_practice_text text;

-- work history gains an optional company website field
alter table public.candidate_work_history
  add column if not exists company_website text;

-- pay_unit gains a 'custom' option for collections-based associates
alter table public.candidate_profiles
  drop constraint if exists candidate_profiles_pay_unit_check;
alter table public.candidate_profiles
  add constraint candidate_profiles_pay_unit_check
  check (pay_unit in ('hourly', 'annual', 'custom'));

-- ============================================================
-- Practice profile gaps
-- ============================================================
alter table public.practice_profiles
  add column if not exists photo_url text,
  add column if not exists ideal_staff_text text,
  add column if not exists specialty text; -- general, ortho, perio, pedo, oral_surgery, cosmetic, etc.

-- Practice operating days/hours -- stored as jsonb on the location row
-- rather than a separate join table, since a practice has at most a
-- handful of locations (unlike candidates, who need one row per day).
-- Note: practice_locations.state already existed since 0001 -- the
-- real gap was that the owner onboarding UI never collected or wrote
-- to it, same root cause as the candidate-side state gap. No schema
-- change needed for state itself, only for operating_hours below.
alter table public.practice_locations
  add column if not exists operating_hours jsonb default '[]';

create table if not exists public.specialties (
  id serial primary key,
  slug text unique not null,
  label text not null
);

insert into public.specialties (slug, label) values
  ('general', 'General Dentistry'),
  ('orthodontics', 'Orthodontics'),
  ('periodontics', 'Periodontics'),
  ('pediatric', 'Pediatric Dentistry'),
  ('oral_surgery', 'Oral Surgery'),
  ('cosmetic', 'Cosmetic Dentistry'),
  ('endodontics', 'Endodontics'),
  ('prosthodontics', 'Prosthodontics')
on conflict do nothing;

-- ============================================================
-- Profiles: terms acceptance + marketing opt-in (owners and candidates
-- both go through signup, so this lives on the shared profiles table)
-- ============================================================
alter table public.profiles
  add column if not exists terms_accepted_at timestamptz,
  add column if not exists marketing_opt_in boolean default false;

-- ============================================================
-- "Type your own" escape hatch for software and dealbreakers.
-- Per founder direction: custom entries are added to the SHARED list
-- immediately (no moderation queue) -- moderation can be added later
-- if it becomes a real problem, but a thin list actively drives people
-- away during early growth, which is the bigger near-term risk.
-- ============================================================
alter table public.software_tags add column if not exists is_user_submitted boolean default false;
alter table public.dealbreaker_tags add column if not exists is_user_submitted boolean default false;

-- ============================================================
-- Profile view tracking -- did not exist at all before this migration.
-- Powers "X practices viewed your profile this week" on the candidate
-- dashboard, which was previously a hardcoded "-" placeholder.
-- ============================================================
create table if not exists public.profile_views (
  id uuid primary key default gen_random_uuid(),
  candidate_id uuid references public.candidate_profiles(id) on delete cascade,
  viewer_practice_id uuid references public.practice_profiles(id) on delete cascade,
  viewed_at timestamptz default now()
);

create index if not exists profile_views_candidate_idx on public.profile_views (candidate_id, viewed_at);

alter table public.profile_views enable row level security;

create policy "Candidates view their own profile view log"
  on public.profile_views for select
  using (auth.uid() = candidate_id);

create policy "Owners can log a profile view"
  on public.profile_views for insert
  with check (auth.uid() = viewer_practice_id);

-- ============================================================
-- "Notify me" preferences -- for both (a) an owner's saved search
-- having no current matches, and (b) a totally empty area/role
-- combination with zero candidates at all yet. Previously there was
-- no way to register this kind of standing notification request.
-- ============================================================
create table if not exists public.match_alerts (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references public.practice_profiles(id) on delete cascade,
  role_id integer references public.roles(id),
  city text,
  state text,
  notified_at timestamptz,
  created_at timestamptz default now()
);

alter table public.match_alerts enable row level security;
create policy "Owners manage their own match alerts"
  on public.match_alerts for all
  using (auth.uid() = owner_id);

-- ============================================================
-- Storage buckets for profile photos -- did not exist before this
-- migration, which is why there was no way to upload a photo anywhere
-- in onboarding. Public buckets because profile photos need to be
-- viewable via a plain public URL once unlocked by a paying owner;
-- access to WHO can see them is still gated by the application-layer
-- blur logic in /api/search and /api/candidate/[id], not by bucket
-- privacy -- a public bucket just means "if you have the exact URL you
-- can view it," and unlocked URLs are only ever sent to paying owners.
-- ============================================================
insert into storage.buckets (id, name, public)
values
  ('candidate-photos', 'candidate-photos', true),
  ('practice-photos', 'practice-photos', true)
on conflict (id) do nothing;

create policy "Candidates upload their own photo"
  on storage.objects for insert
  with check (
    bucket_id = 'candidate-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Candidates update their own photo"
  on storage.objects for update
  using (
    bucket_id = 'candidate-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Anyone can view candidate photos"
  on storage.objects for select
  using (bucket_id = 'candidate-photos');

create policy "Owners upload their own practice photo"
  on storage.objects for insert
  with check (
    bucket_id = 'practice-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Owners update their own practice photo"
  on storage.objects for update
  using (
    bucket_id = 'practice-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Anyone can view practice photos"
  on storage.objects for select
  using (bucket_id = 'practice-photos');
