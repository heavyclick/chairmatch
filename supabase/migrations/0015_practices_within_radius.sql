-- ============================================================
-- Symmetric to candidates_within_radius (migration 0001) -- that
-- function already existed and was already correct, it just had
-- nothing populating candidate_profiles.location and nothing calling
-- it. This adds the other direction: a candidate browsing practices
-- (src/app/api/candidate/practices/route.ts) needs to find practices
-- within radius of the CANDIDATE's own location, using
-- practice_locations.location (which also already existed, unused,
-- same as the candidate side).
-- ============================================================
create or replace function public.practices_within_radius(
  center_lat double precision,
  center_lng double precision,
  radius_miles double precision
)
returns setof public.practice_locations
language sql
stable
as $$
  select *
  from public.practice_locations
  where st_dwithin(
    location,
    st_setsrid(st_makepoint(center_lng, center_lat), 4326)::geography,
    radius_miles * 1609.34
  )
$$;

-- ============================================================
-- Convenience wrapper: radius search centered on a PRACTICE's own
-- stored location, looked up by practice_id directly in SQL rather
-- than requiring the caller to first extract that practice's lat/lng
-- and pass them back in as separate parameters (which would mean
-- round-tripping coordinates through JS/JSON for no real benefit --
-- the practice's location is already sitting right there in
-- practice_locations). This is what /api/search actually calls for
-- the default "candidates near my practice" browse view.
-- ============================================================
create or replace function public.candidates_within_radius_of_practice(
  practice_id_input uuid,
  radius_miles double precision
)
returns setof public.candidate_profiles
language sql
stable
as $$
  select cp.*
  from public.candidate_profiles cp, public.practice_locations pl
  where pl.practice_id = practice_id_input
    and pl.is_primary = true
    and pl.location is not null
    and cp.location is not null
    and st_dwithin(cp.location, pl.location, radius_miles * 1609.34)
$$;

-- ============================================================
-- Lets callers distinguish "this practice's location isn't geocoded
-- yet, fall back to text-based city matching" from "genuinely zero
-- candidates within radius" -- both look like "zero rows" from
-- candidates_within_radius_of_practice above, but need different
-- handling (fall back vs. legitimately show no results).
-- ============================================================
create or replace function public.practice_has_geocoded_location(
  practice_id_input uuid
)
returns boolean
language sql
stable
as $$
  select exists(
    select 1 from public.practice_locations
    where practice_id = practice_id_input and is_primary = true and location is not null
  )
$$;
