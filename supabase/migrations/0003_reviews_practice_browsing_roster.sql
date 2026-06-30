-- ChairMatch migration 0003
-- Run AFTER 0001 and 0002. Additive-only, same convention as before.

-- ============================================================
-- Expanding match_alerts (from 0002) to support full custom filter
-- criteria -- not just role/city/state. The founder asked for "set
-- specific preferences and get notified when a match comes up," which
-- the original role+location-only alert can't represent (e.g. "notify
-- me about a hygienist, $50+/hr, open to remote, within 20mi"). Stored
-- as a jsonb snapshot of the same BrowseFilters shape the browse page
-- already uses, so the matching logic can reuse /api/search's own
-- filter-application code rather than reimplementing it.
-- ============================================================
alter table public.match_alerts
  add column if not exists filters jsonb default '{}',
  add column if not exists label text;

-- ============================================================
-- Platform-wide config -- a single fixed unlock date for candidate
-- practice-browsing, NOT per-candidate. The founder's stated reason
-- ("we just launched and don't want them to find out there's no
-- practices yet") is about platform maturity, not individual tenure,
-- so this is one global date everyone checks against, not a per-row
-- "signup_date + 30 days" calculation.
-- ============================================================
create table if not exists public.platform_config (
  key text primary key,
  value text not null,
  updated_at timestamptz default now()
);

-- Default: 30 days from whenever this migration runs. Update this row
-- directly in the Supabase dashboard/SQL editor to change the real
-- launch-unlock date once you know it.
insert into public.platform_config (key, value)
values ('candidate_browse_unlock_at', (now() + interval '30 days')::text)
on conflict (key) do nothing;

-- ============================================================
-- Practice photo gallery -- profile_photo_url already exists
-- (practice_profiles.photo_url from 0002); this adds SEVERAL photos
-- (team photos, office photos, etc.) as a separate table since a
-- practice can have any number of them, unlike the single profile photo.
-- ============================================================
create table if not exists public.practice_gallery_photos (
  id uuid primary key default gen_random_uuid(),
  practice_id uuid references public.practice_profiles(id) on delete cascade,
  photo_url text not null,
  caption text,
  sort_order integer default 0,
  created_at timestamptz default now()
);

alter table public.practice_gallery_photos enable row level security;
create policy "Owners manage their own gallery photos"
  on public.practice_gallery_photos for all
  using (auth.uid() = practice_id);
create policy "Anyone authenticated can view gallery photos"
  on public.practice_gallery_photos for select
  using (auth.role() = 'authenticated');

-- Google review link + cached rating, shown on the practice profile.
-- Cached rather than live-fetched on every page view because the
-- Google Places API has real per-request cost and rate limits --
-- refreshing periodically via a background job (not built yet, see
-- README) is far cheaper than calling it on every profile view.
alter table public.practice_profiles
  add column if not exists google_review_url text,
  add column if not exists google_rating numeric,
  add column if not exists google_rating_count integer,
  add column if not exists google_rating_synced_at timestamptz;

insert into storage.buckets (id, name, public)
values ('practice-gallery', 'practice-gallery', true)
on conflict (id) do nothing;

create policy "Owners upload their own gallery photos"
  on storage.objects for insert
  with check (
    bucket_id = 'practice-gallery'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Owners delete their own gallery photos"
  on storage.objects for delete
  using (
    bucket_id = 'practice-gallery'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Anyone can view practice gallery photos"
  on storage.objects for select
  using (bucket_id = 'practice-gallery');

-- ============================================================
-- Candidate reviews -- public-facing (no login required to READ or to
-- SUBMIT), but with light-touch accountability: reviewer name + email
-- captured (not verified via email-click, per founder decision), one
-- review per reviewer-email per candidate enforced at the DB level,
-- and a flagging system instead of unilateral candidate-side deletion.
-- ============================================================
create table if not exists public.candidate_reviews (
  id uuid primary key default gen_random_uuid(),
  candidate_id uuid references public.candidate_profiles(id) on delete cascade,
  reviewer_name text not null,
  reviewer_email text not null,
  rating integer not null check (rating between 1 and 5),
  review_text text,
  -- Public by default; set to false when a flag is upheld and the
  -- review is taken down, OR while a flag is pending review (see
  -- candidate_review_flags below) -- pending-hidden, not
  -- pending-but-still-visible, since a flagged review shouldn't stay
  -- live while under dispute.
  is_visible boolean default true,
  created_at timestamptz default now(),
  unique (candidate_id, reviewer_email)
);

create index if not exists candidate_reviews_candidate_idx on public.candidate_reviews (candidate_id, is_visible);

alter table public.candidate_reviews enable row level security;

-- Public read access to visible reviews -- this table is intentionally
-- readable WITHOUT authentication, since the whole point is a
-- shareable public profile link patients/coworkers can view without
-- an account.
create policy "Anyone can read visible reviews"
  on public.candidate_reviews for select
  using (is_visible = true);

-- Candidates can see ALL reviews on their own profile, including
-- currently-hidden/flagged ones, so they know what's pending.
create policy "Candidates view all reviews on their own profile"
  on public.candidate_reviews for select
  using (auth.uid() = candidate_id);

-- Submission is intentionally NOT gated by an RLS policy requiring
-- auth.uid() -- public review submission goes through a server route
-- using the service-role client (see /api/reviews/submit), since the
-- reviewer has no Supabase session at all. Rate-limiting and the
-- one-review-per-email-per-candidate constraint above are the actual
-- abuse controls, not RLS (RLS can't see an anonymous request's email
-- before the row is inserted).

create table if not exists public.candidate_review_flags (
  id uuid primary key default gen_random_uuid(),
  review_id uuid references public.candidate_reviews(id) on delete cascade,
  flagged_by_candidate_id uuid references public.candidate_profiles(id),
  reason text not null,
  status text default 'pending' check (status in ('pending', 'upheld', 'dismissed')),
  created_at timestamptz default now(),
  resolved_at timestamptz
);

alter table public.candidate_review_flags enable row level security;
create policy "Candidates flag reviews on their own profile"
  on public.candidate_review_flags for insert
  with check (auth.uid() = flagged_by_candidate_id);
create policy "Candidates view their own flags"
  on public.candidate_review_flags for select
  using (auth.uid() = flagged_by_candidate_id);

-- ============================================================
-- Candidate-side practice browsing + per-practice hiding.
-- A candidate can hide their OWN profile from one specific practice
-- (e.g. "hide me from my current employer") -- distinct from the
-- existing global visibility_status, which is all-or-nothing.
-- ============================================================
create table if not exists public.candidate_practice_blocks (
  candidate_id uuid references public.candidate_profiles(id) on delete cascade,
  practice_id uuid references public.practice_profiles(id) on delete cascade,
  created_at timestamptz default now(),
  primary key (candidate_id, practice_id)
);

alter table public.candidate_practice_blocks enable row level security;
create policy "Candidates manage their own practice blocks"
  on public.candidate_practice_blocks for all
  using (auth.uid() = candidate_id);

-- "Notify me when practice X joins" -- symmetric to match_alerts, but
-- keyed to a specific named practice the candidate is watching for,
-- rather than a role/location combination.
create table if not exists public.candidate_practice_watch (
  id uuid primary key default gen_random_uuid(),
  candidate_id uuid references public.candidate_profiles(id) on delete cascade,
  practice_name_query text not null, -- the name they searched for, since the practice may not exist yet
  city text,
  state text,
  notified_at timestamptz,
  created_at timestamptz default now()
);

alter table public.candidate_practice_watch enable row level security;
create policy "Candidates manage their own practice watches"
  on public.candidate_practice_watch for all
  using (auth.uid() = candidate_id);

-- ============================================================
-- Practice team roster -- a practice can pre-add a candidate to a
-- "potential team" roster before that candidate ever joins/responds.
-- This is a third relationship type, distinct from a message thread
-- (no conversation implied) and distinct from "unlocked" (no payment
-- implied) -- it's a private shortlist, visible to the candidate only
-- if the candidate has opted in to being discoverable this way.
-- ============================================================
create table if not exists public.practice_team_roster (
  id uuid primary key default gen_random_uuid(),
  practice_id uuid references public.practice_profiles(id) on delete cascade,
  candidate_id uuid references public.candidate_profiles(id) on delete cascade,
  note text, -- private note, visible only to the practice
  created_at timestamptz default now(),
  unique (practice_id, candidate_id)
);

alter table public.practice_team_roster enable row level security;
create policy "Owners manage their own roster"
  on public.practice_team_roster for all
  using (auth.uid() = practice_id);

-- Candidate-side opt-in: can a practice add them to a roster without
-- their explicit action? Default true (discoverable) -- a candidate
-- can flip this off in settings if they don't want to be pre-added
-- before ever being contacted.
alter table public.candidate_profiles
  add column if not exists allow_roster_add boolean default true;
