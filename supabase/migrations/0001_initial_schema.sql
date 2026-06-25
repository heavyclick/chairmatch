-- ChairMatch initial schema
-- Run via: supabase db push  (or paste into the Supabase SQL editor)
--
-- Design notes:
-- - profiles.account_type splits owner/candidate; most tables below are
--   scoped to one side or the other via foreign key + RLS.
-- - PostGIS is used for radius search on candidate_profiles and
--   practice_locations (lat/lng -> geography).
-- - Row-level security is the real enforcement layer for "owners can't
--   see other owners' messages" etc. -- never rely on app-layer checks alone.

create extension if not exists postgis;

-- ============================================================
-- 1. PROFILES (extends Supabase auth.users)
-- ============================================================
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  phone text,
  account_type text not null check (account_type in ('owner', 'candidate')),
  notification_sms_messages boolean default true,
  notification_sms_invites boolean default true,
  notification_sms_temp_jobs boolean default false,
  notification_email_digest boolean default true,
  created_at timestamptz default now(),
  last_active_at timestamptz default now()
);

alter table public.profiles enable row level security;

create policy "Users can view their own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can update their own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- ============================================================
-- 2. ROLE TAXONOMY (controlled vocabulary, not free text)
-- ============================================================
create table public.roles (
  id serial primary key,
  slug text unique not null,
  label text not null
);

insert into public.roles (slug, label) values
  ('dentist_associate', 'Dentist / Associate (DDS, DMD)'),
  ('hygienist', 'Dental Hygienist (RDH)'),
  ('dental_assistant', 'Dental Assistant (DA, RDA, EFDA)'),
  ('office_manager', 'Office / Practice Manager'),
  ('front_desk', 'Front Desk'),
  ('treatment_coordinator', 'Treatment Coordinator'),
  ('billing_coordinator', 'Billing / Insurance Coordinator'),
  ('lab_tech', 'Dental Lab Technician'),
  ('sales_rep', 'Dental Sales Representative');

create table public.role_aliases (
  id serial primary key,
  role_id integer references public.roles(id) on delete cascade,
  slug text not null,
  label text not null,
  unique (role_id, slug)
);

-- e.g. office_manager -> practice_manager, operations_manager, business_manager
insert into public.role_aliases (role_id, slug, label)
  select id, 'practice_manager', 'Practice Manager' from public.roles where slug = 'office_manager'
  union all
  select id, 'operations_manager', 'Operations Manager' from public.roles where slug = 'office_manager'
  union all
  select id, 'business_manager', 'Business Manager' from public.roles where slug = 'office_manager';

create table public.dealbreaker_tags (
  id serial primary key,
  slug text unique not null,
  label text not null
);

insert into public.dealbreaker_tags (slug, label) values
  ('no_dso', 'No DSO / corporate offices'),
  ('no_spousal_management', 'No husband-and-wife co-managed practices'),
  ('no_multi_doctor_high_volume', 'No multi-doctor high-volume clinics');

create table public.software_tags (
  id serial primary key,
  slug text unique not null,
  label text not null
);

insert into public.software_tags (slug, label) values
  ('dentrix', 'Dentrix'),
  ('eaglesoft', 'Eaglesoft'),
  ('open_dental', 'Open Dental');

-- ============================================================
-- 3. CANDIDATE PROFILE
-- ============================================================
create table public.candidate_profiles (
  id uuid primary key references public.profiles(id) on delete cascade,
  full_name text not null,
  photo_url text,
  primary_role_id integer references public.roles(id) not null,

  -- logistics
  city text,
  state text,
  zip text,
  location geography(point, 4326), -- derived from zip on save, used for radius search
  employment_types text[] default '{}', -- subset of {full_time, part_time, temp}
  open_to_relocation boolean default false,

  -- compensation
  pay_range_min numeric,
  pay_range_max numeric,
  pay_unit text check (pay_unit in ('hourly', 'annual')),

  -- pedigree
  university text,
  certifications text[] default '{}',
  ce_courses text[] default '{}',
  years_experience numeric,

  -- the qualitative differentiator -- treat these three as the core
  -- product, not optional bio fields
  value_add_text text,
  future_goals_text text,
  recovery_scenario_text text,

  -- status
  visibility_status text default 'actively_looking'
    check (visibility_status in ('actively_looking', 'open', 'off_market')),
  profile_completeness_score integer default 0,

  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index candidate_profiles_location_idx on public.candidate_profiles using gist (location);
create index candidate_profiles_role_idx on public.candidate_profiles (primary_role_id);

alter table public.candidate_profiles enable row level security;

-- Candidates can fully manage their own profile.
create policy "Candidates manage own profile"
  on public.candidate_profiles for all
  using (auth.uid() = id);

-- Any authenticated owner can read candidate profiles (the whole product
-- depends on owners browsing freely; name/photo gating happens at the
-- application layer based on subscription_tier, not via RLS row hiding --
-- RLS hides ROWS, not individual columns, so blur logic lives in the API
-- response shaping, not the database).
create policy "Owners can view candidate profiles"
  on public.candidate_profiles for select
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid() and profiles.account_type = 'owner'
    )
  );

create table public.candidate_role_aliases (
  candidate_id uuid references public.candidate_profiles(id) on delete cascade,
  alias_id integer references public.role_aliases(id) on delete cascade,
  primary key (candidate_id, alias_id)
);

create table public.candidate_dealbreakers (
  candidate_id uuid references public.candidate_profiles(id) on delete cascade,
  tag_id integer references public.dealbreaker_tags(id) on delete cascade,
  primary key (candidate_id, tag_id)
);

create table public.candidate_software (
  candidate_id uuid references public.candidate_profiles(id) on delete cascade,
  tag_id integer references public.software_tags(id) on delete cascade,
  primary key (candidate_id, tag_id)
);

create table public.candidate_work_history (
  id uuid primary key default gen_random_uuid(),
  candidate_id uuid references public.candidate_profiles(id) on delete cascade,
  employer_name text not null,
  role_title text,
  start_date date,
  end_date date, -- null = current
  sort_order integer default 0
);

alter table public.candidate_work_history enable row level security;
create policy "Candidates manage own work history"
  on public.candidate_work_history for all
  using (exists (select 1 from public.candidate_profiles where id = candidate_id and id = auth.uid()));
create policy "Owners view work history"
  on public.candidate_work_history for select
  using (exists (select 1 from public.profiles where id = auth.uid() and account_type = 'owner'));

create table public.candidate_availability (
  candidate_id uuid references public.candidate_profiles(id) on delete cascade,
  day_of_week integer not null check (day_of_week between 0 and 6),
  start_time time,
  end_time time,
  primary key (candidate_id, day_of_week)
);

-- ============================================================
-- 4. PRACTICE (OWNER) PROFILE
-- ============================================================
create table public.practice_profiles (
  id uuid primary key references public.profiles(id) on delete cascade,
  practice_name text not null,
  practice_type text check (practice_type in ('solo', 'group', 'dso')),

  -- mandatory culture disclosure -- required before posting/browsing,
  -- enforced at the application layer (onboarding flow gate), not DB-level,
  -- since "mandatory" here means a UX gate, not a NOT NULL constraint
  -- (a practice should be able to save a partial draft).
  culture_text text,
  thrive_text text,
  honest_challenges_text text,

  subscription_tier text default 'free' check (subscription_tier in ('free', 'standard', 'pro')),
  subscription_renews_at timestamptz,
  screening_credit_balance integer default 0,
  stripe_customer_id text,

  created_at timestamptz default now()
);

alter table public.practice_profiles enable row level security;
create policy "Owners manage own practice profile"
  on public.practice_profiles for all
  using (auth.uid() = id);

create table public.practice_locations (
  id uuid primary key default gen_random_uuid(),
  practice_id uuid references public.practice_profiles(id) on delete cascade,
  city text,
  state text,
  zip text,
  location geography(point, 4326),
  radius_miles integer default 15,
  is_primary boolean default true
);

create index practice_locations_geo_idx on public.practice_locations using gist (location);

create table public.practice_software (
  practice_id uuid references public.practice_profiles(id) on delete cascade,
  tag_id integer references public.software_tags(id) on delete cascade,
  primary key (practice_id, tag_id)
);

-- ============================================================
-- 5. SAVED SEARCHES
-- ============================================================
create table public.saved_searches (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references public.practice_profiles(id) on delete cascade,
  label text,
  role_id integer references public.roles(id),
  employment_type text,
  pay_min numeric,
  pay_max numeric,
  distance_miles integer,
  min_years_experience numeric,
  excluded_dealbreaker_ids integer[] default '{}',
  open_to_relocation_only boolean default false,
  last_viewed_at timestamptz default now(),
  created_at timestamptz default now()
);

alter table public.saved_searches enable row level security;
create policy "Owners manage own saved searches"
  on public.saved_searches for all
  using (auth.uid() = owner_id);

-- ============================================================
-- 6. MESSAGING
-- ============================================================
create table public.message_threads (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references public.practice_profiles(id) on delete cascade,
  candidate_id uuid references public.candidate_profiles(id) on delete cascade,
  created_at timestamptz default now(),
  unique (owner_id, candidate_id)
);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid references public.message_threads(id) on delete cascade,
  sender_id uuid references public.profiles(id),
  body text not null,
  ai_drafted boolean default false,
  ai_approved_by_sender boolean default true, -- false only transiently while in review queue
  sent_at timestamptz default now()
);

alter table public.message_threads enable row level security;
alter table public.messages enable row level security;

create policy "Participants view their threads"
  on public.message_threads for select
  using (auth.uid() = owner_id or auth.uid() = candidate_id);

create policy "Participants view their messages"
  on public.messages for select
  using (
    exists (
      select 1 from public.message_threads
      where id = thread_id and (owner_id = auth.uid() or candidate_id = auth.uid())
    )
  );

create policy "Participants send messages in their threads"
  on public.messages for insert
  with check (
    exists (
      select 1 from public.message_threads
      where id = thread_id and (owner_id = auth.uid() or candidate_id = auth.uid())
    )
  );

-- ============================================================
-- 7. AI SCREENING
-- ============================================================
create table public.screening_sessions (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references public.practice_profiles(id) on delete cascade,
  candidate_id uuid references public.candidate_profiles(id) on delete cascade,
  credits_spent integer default 1,
  status text default 'invited'
    check (status in ('invited', 'declined', 'in_progress', 'completed')),
  consent_given_at timestamptz,
  transcript jsonb default '[]',
  scorecard jsonb, -- { pass_flags: [], concern_flags: [], summary_text: "" }
  candidate_reviewed_summary boolean default false,
  created_at timestamptz default now(),
  completed_at timestamptz
);

alter table public.screening_sessions enable row level security;
create policy "Owner views own screening sessions"
  on public.screening_sessions for select
  using (auth.uid() = owner_id);
create policy "Candidate views own screening sessions"
  on public.screening_sessions for select
  using (auth.uid() = candidate_id);
create policy "Candidate updates consent and responses"
  on public.screening_sessions for update
  using (auth.uid() = candidate_id);

-- ============================================================
-- 8. BILLING
-- ============================================================
create table public.screening_credit_purchases (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references public.practice_profiles(id) on delete cascade,
  pack_size integer not null,
  price_paid_cents integer not null,
  stripe_payment_intent_id text,
  purchased_at timestamptz default now()
);

alter table public.screening_credit_purchases enable row level security;
create policy "Owner views own credit purchases"
  on public.screening_credit_purchases for select
  using (auth.uid() = owner_id);

-- Subscription state itself lives on practice_profiles
-- (subscription_tier, subscription_renews_at, stripe_customer_id above).
-- Stripe webhook handler updates these fields via the service-role client,
-- bypassing RLS -- see src/app/api/stripe/webhook/route.ts.

-- ============================================================
-- 9. HELPER FUNCTION -- radius search
-- ============================================================
create or replace function public.candidates_within_radius(
  center_lat double precision,
  center_lng double precision,
  radius_miles double precision
)
returns setof public.candidate_profiles
language sql
stable
as $$
  select *
  from public.candidate_profiles
  where st_dwithin(
    location,
    st_setsrid(st_makepoint(center_lng, center_lat), 4326)::geography,
    radius_miles * 1609.34
  )
$$;
