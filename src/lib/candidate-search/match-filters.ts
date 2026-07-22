import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

/** Mirrors src/components/owner/filter-sheet.tsx's  BrowseFilters shape -- match_alerts.filters is a jsonb snapshot of exactly this. */
export interface AlertFilters {
  roleSlugs?: string[];
  city?: string;
  state?: string;
  zip?: string;
  payMin?: string;
  payMax?: string;
  minYearsExperience?: string;
  softwareSlugs?: string[];
  customSoftware?: string[];
  openToRelocationOnly?: boolean;
  openToRemoteOnly?: boolean;
  availableDays?: number[];
  excludeDealbreakerSlugs?: string[];
}

interface MatchableCandidate {
  id: string;
  primary_role_id: number | null;
  employment_types: string[] | null;
  pay_range_min: number | null;
  pay_range_max: number | null;
  years_experience: number | null;
  open_to_relocation: boolean | null;
  open_to_remote: boolean | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  softwareSlugs: string[];
  dealbreakerSlugs: string[];
  availableDays: number[];
}

/**
 * Fetches everything needed to evaluate a candidate against any number
 * of alert filter sets, in one shot -- called once per newly-signed-up
 * or updated candidate, then checked against every open match_alerts
 * row in memory (see check-and-notify.ts), rather than re-querying per
 * alert.
 */
export async function fetchCandidateForMatching(
  supabase: SupabaseClient<Database>,
  candidateId: string
): Promise<MatchableCandidate | null> {
  const { data: candidate } = await supabase
    .from("candidate_profiles")
    .select(
      `id, primary_role_id, employment_types, pay_range_min, pay_range_max,
       years_experience, open_to_relocation, open_to_remote, city, state, zip,
       software:candidate_software(software_tags(slug)),
       dealbreakers:candidate_dealbreakers(dealbreaker_tags(slug))`
    )
    .eq("id", candidateId)
    .eq("visibility_status", "actively_looking")
    .single();

  if (!candidate) return null;

  const { data: availabilityRows } = await supabase
    .from("candidate_availability")
    .select("day_of_week")
    .eq("candidate_id", candidateId);

  return {
    id: candidate.id,
    primary_role_id: candidate.primary_role_id,
    employment_types: candidate.employment_types,
    pay_range_min: candidate.pay_range_min,
    pay_range_max: candidate.pay_range_max,
    years_experience: candidate.years_experience,
    open_to_relocation: candidate.open_to_relocation,
    open_to_remote: candidate.open_to_remote,
    city: candidate.city,
    state: candidate.state,
    zip: candidate.zip,
    // NOTE: PostgREST returns a singular object here, not an array --
    // candidate_software.tag_id -> software_tags.id is many-to-one, so
    // each row embeds exactly one software_tags object. This matches
    // the identical access pattern already verified working in
    // /api/search/route.ts. The `as` cast below is needed only because
    // this project's Database type is currently a placeholder `any`
    // (see src/types/database.ts), so supabase-js can't see real
    // foreign-key cardinality and its generic inference defaults to
    // typing the embed as an array -- that's a type-inference quirk,
    // not the actual runtime shape. Do NOT "fix" this by indexing with
    // [0] -- that would silently break every match by always reading
    // undefined off a plain object.
    softwareSlugs: ((candidate.software ?? []) as unknown as { software_tags: { slug: string } }[]).map(
      (s) => s.software_tags.slug
    ),
    dealbreakerSlugs: ((candidate.dealbreakers ?? []) as unknown as { dealbreaker_tags: { slug: string } }[]).map(
      (d) => d.dealbreaker_tags.slug
    ),
    availableDays: (availabilityRows ?? []).map((a) => a.day_of_week),
  };
}

/**
 * Returns true if `filters` has at least one meaningful constraint set.
 * An alert stored as `{}` (empty object) would otherwise match every
 * candidate in the system -- every check in candidateMatchesFilters is
 * guarded by a truthiness test that silently passes when the field is
 * absent, so an unconstrained alert falls through to `return true`.
 *
 * This guard is the single source of truth for "is this alert
 * actionable?" -- used both here (server-side matching) and in
 * browse/page.tsx (client-side, before POSTing the alert) so the two
 * stay in sync. If you add a new filter field to AlertFilters, add it
 * here too.
 */
export function alertHasMeaningfulFilters(filters: AlertFilters): boolean {
  return (
    (filters.roleSlugs?.length ?? 0) > 0 ||
    !!filters.city ||
    !!filters.state ||
    !!filters.zip ||
    !!filters.payMin ||
    !!filters.payMax ||
    !!filters.minYearsExperience ||
    !!filters.openToRelocationOnly ||
    !!filters.openToRemoteOnly ||
    (filters.softwareSlugs?.length ?? 0) > 0 ||
    (filters.customSoftware?.length ?? 0) > 0 ||
    (filters.excludeDealbreakerSlugs?.length ?? 0) > 0 ||
    (filters.availableDays?.length ?? 0) > 0
  );
}

/**
 * Evaluates whether `candidate` satisfies `filters`. Deliberately does
 * NOT implement true radius/distance matching (that needs the alert
 * owner's practice lat/lng plus the candidates_within_radius() RPC per
 * alert, real but meaningfully more plumbing) -- city/state equality is
 * used as a reasonable approximation for alert-matching purposes. If
 * that ever proves too loose in practice, this is the function to
 * upgrade, not the calling code.
 *
 * IMPORTANT: always call alertHasMeaningfulFilters() before calling
 * this function. An empty `filters` object passes every check below and
 * returns true, which would match every candidate in the system.
 */
export function candidateMatchesFilters(
  candidate: MatchableCandidate,
  filters: AlertFilters,
  roleIdBySlug: Map<string, number>
): boolean {
  // Safety net: an alert with no constraints matches everyone -- treat
  // it as unactionable rather than firing on the entire candidate pool.
  // Callers should also gate on alertHasMeaningfulFilters() upstream,
  // but this guard means a missed upstream check can't cause a storm.
  if (!alertHasMeaningfulFilters(filters)) return false;

  if (filters.roleSlugs?.length) {
    const wantedRoleIds = filters.roleSlugs
      .map((slug) => roleIdBySlug.get(slug))
      .filter((id): id is number => id != null);
    if (wantedRoleIds.length && !wantedRoleIds.includes(candidate.primary_role_id ?? -1)) {
      return false;
    }
  }

  if (filters.city && candidate.city?.toLowerCase() !== filters.city.toLowerCase()) return false;
  if (filters.state && candidate.state?.toLowerCase() !== filters.state.toLowerCase()) return false;
  if (filters.zip && candidate.zip !== filters.zip) return false;

  if (filters.payMin && (candidate.pay_range_max ?? 0) < Number(filters.payMin)) return false;
  if (filters.payMax && (candidate.pay_range_min ?? Infinity) > Number(filters.payMax)) return false;

  if (filters.minYearsExperience && (candidate.years_experience ?? 0) < Number(filters.minYearsExperience)) {
    return false;
  }

  if (filters.openToRelocationOnly && !candidate.open_to_relocation) return false;
  if (filters.openToRemoteOnly && !candidate.open_to_remote) return false;

  if (filters.softwareSlugs?.length || filters.customSoftware?.length) {
    const wanted = new Set([...(filters.softwareSlugs ?? []), ...(filters.customSoftware ?? [])]);
    if (!candidate.softwareSlugs.some((slug) => wanted.has(slug))) return false;
  }

  if (filters.excludeDealbreakerSlugs?.length) {
    const excluded = new Set(filters.excludeDealbreakerSlugs);
    if (candidate.dealbreakerSlugs.some((slug) => excluded.has(slug))) return false;
  }

  if (filters.availableDays?.length) {
    const wantedDays = new Set(filters.availableDays);
    if (!candidate.availableDays.some((d) => wantedDays.has(d))) return false;
  }

  return true;
}
