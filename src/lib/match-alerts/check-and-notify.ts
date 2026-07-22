import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import {
  fetchCandidateForMatching,
  candidateMatchesFilters,
  alertHasMeaningfulFilters,
  type AlertFilters,
} from "@/lib/candidate-search/match-filters";
import { notifyUser } from "@/lib/notifications/create";

/**
 * Checks one candidate against every saved match_alerts row and
 * notifies (in-app + email) any owner whose alert now matches this
 * candidate for the first time. Call this:
 *   1. Right after a candidate finishes onboarding (visibility_status
 *      first becomes "actively_looking") -- the main "new candidate
 *      joined that fits my criteria" case this feature exists for.
 *   2. After a candidate updates their profile -- a candidate who
 *      previously didn't match (e.g. added a new software skill) might
 *      newly match an existing alert.
 *
 * Must be called with the SERVICE-ROLE client -- match_alerts has no
 * select policy letting one owner see another's alerts (correctly), but
 * this needs to check every owner's alerts against one candidate, and
 * match_alert_notifications has no insert policy for regular users at
 * all (migration 0006).
 *
 * IMPORTANT LIMITATION this function alone does NOT cover: it only
 * looks forward from a candidate-side change. If an owner creates a
 * brand-new alert that would already match a candidate who joined
 * BEFORE the alert existed, this function is never triggered for that
 * candidate again (nothing about them changed) -- see
 * checkExistingCandidatesForNewAlert below, which covers that other
 * direction, called once right after an alert is created.
 */
export async function checkMatchAlertsForCandidate(
  supabase: SupabaseClient<Database>,
  candidateId: string
) {
  const candidate = await fetchCandidateForMatching(supabase, candidateId);
  if (!candidate) {
    console.log(`[match-alerts] candidate ${candidateId} not actively_looking or not found -- skipping`);
    return;
  }

  const { data: alerts } = await supabase.from("match_alerts").select("id, owner_id, filters, label");
  if (!alerts || alerts.length === 0) {
    console.log("[match-alerts] no alerts exist at all -- nothing to check against");
    return;
  }
  console.log(`[match-alerts] checking candidate ${candidateId} against ${alerts.length} alert(s)`);

  const roleIdBySlug = await resolveRoleSlugsForAlerts(supabase, alerts);

  const { data: alreadyNotified } = await supabase
    .from("match_alert_notifications")
    .select("alert_id")
    .eq("candidate_id", candidateId);
  const alreadyNotifiedAlertIds = new Set((alreadyNotified ?? []).map((n) => n.alert_id));

  let matchCount = 0;
  for (const alert of alerts) {
    if (alreadyNotifiedAlertIds.has(alert.id)) continue;
    const filters = (alert.filters ?? {}) as AlertFilters;

    // Skip alerts with no meaningful constraints -- an empty filter
    // object would match every candidate in the system (every check in
    // candidateMatchesFilters is guarded by a truthiness test that
    // passes when the field is absent). candidateMatchesFilters also
    // has this guard internally, but checking here avoids the
    // unnecessary fetchCandidateForMatching work for empty alerts.
    if (!alertHasMeaningfulFilters(filters)) {
      console.log(`[match-alerts] alert ${alert.id} has no constraints -- skipping (not actionable)`);
      continue;
    }

    if (!candidateMatchesFilters(candidate, filters, roleIdBySlug)) continue;
    matchCount++;
    await notifyMatch(supabase, alert, candidateId);
  }
  console.log(`[match-alerts] candidate ${candidateId}: ${matchCount} new match(es) notified`);
}

/**
 * The other direction: called once, right after an owner creates a
 * NEW alert, to check it against every candidate who ALREADY exists
 * and already matches -- without this, an alert created after a
 * matching candidate already joined would never fire for that
 * candidate, since nothing about the candidate changes afterward to
 * trigger checkMatchAlertsForCandidate above. This is very likely what
 * happened in reported cases of "I made an alert, it should match,
 * nothing happened" depending on which order the alert vs. candidate
 * were created in.
 */
export async function checkExistingCandidatesForNewAlert(
  supabase: SupabaseClient<Database>,
  alertId: string
) {
  const { data: alert } = await supabase
    .from("match_alerts")
    .select("id, owner_id, filters, label")
    .eq("id", alertId)
    .single();
  if (!alert) return;

  // Refuse to run an existence-check for an alert with no constraints.
  // Without this guard, a "Notify me" click with zero filters would
  // immediately send one notification per actively_looking candidate
  // in the entire database -- this is the primary cause of the 500+
  // notification storm reported in production.
  const filters = (alert.filters ?? {}) as AlertFilters;
  if (!alertHasMeaningfulFilters(filters)) {
    console.log(
      `[match-alerts] alert ${alertId} has no constraints -- skipping existence check (not actionable)`
    );
    return;
  }

  const { data: candidates } = await supabase
    .from("candidate_profiles")
    .select("id")
    .eq("visibility_status", "actively_looking");
  if (!candidates || candidates.length === 0) return;

  const roleIdBySlug = await resolveRoleSlugsForAlerts(supabase, [alert]);

  console.log(`[match-alerts] new alert ${alertId}: checking against ${candidates.length} existing candidate(s)`);
  let matchCount = 0;
  for (const c of candidates) {
    const { data: alreadyNotified } = await supabase
      .from("match_alert_notifications")
      .select("alert_id")
      .eq("alert_id", alertId)
      .eq("candidate_id", c.id)
      .maybeSingle();
    if (alreadyNotified) continue;

    const candidate = await fetchCandidateForMatching(supabase, c.id);
    if (!candidate) continue;

    if (!candidateMatchesFilters(candidate, filters, roleIdBySlug)) continue;

    matchCount++;
    await notifyMatch(supabase, alert, c.id);
  }
  console.log(`[match-alerts] new alert ${alertId}: ${matchCount} existing match(es) notified`);
}

async function resolveRoleSlugsForAlerts(
  supabase: SupabaseClient<Database>,
  alerts: { filters: unknown }[]
): Promise<Map<string, number>> {
  const allRoleSlugs = new Set<string>();
  for (const alert of alerts) {
    const filters = (alert.filters ?? {}) as AlertFilters;
    filters.roleSlugs?.forEach((slug) => allRoleSlugs.add(slug));
  }
  const roleIdBySlug = new Map<string, number>();
  if (allRoleSlugs.size > 0) {
    const { data: roleRows } = await supabase
      .from("roles")
      .select("id, slug")
      .in("slug", Array.from(allRoleSlugs));
    for (const r of roleRows ?? []) roleIdBySlug.set(r.slug, r.id);
  }
  return roleIdBySlug;
}

async function notifyMatch(
  supabase: SupabaseClient<Database>,
  alert: { id: string; owner_id: string; label: string | null },
  candidateId: string
) {
  // Upsert the dedup record BEFORE sending the notification.
  // Two things this fixes vs. the original plain .insert():
  //
  //   1. Race condition: if this function is invoked concurrently for
  //      the same (alert, candidate) pair (e.g. a candidate saves their
  //      profile twice in quick succession), both invocations read the
  //      dedup table before either writes -- both see "not yet notified"
  //      and both fire. Upsert with ignoreDuplicates means the second
  //      write is a no-op rather than a second insert, but more
  //      importantly: we check the error below and bail out if we
  //      couldn't write the dedup record, which prevents sending a
  //      notification we can't track.
  //
  //   2. Silent failure: the original code did not check the insert
  //      error. If the insert failed (constraint violation, network
  //      blip, etc.) the notification still fired, but no dedup record
  //      was written -- meaning the next trigger for the same pair
  //      would re-notify. Now: no dedup record = no notification.
  const { error: dedupError } = await supabase
    .from("match_alert_notifications")
    .upsert(
      { alert_id: alert.id, candidate_id: candidateId },
      { onConflict: "alert_id,candidate_id", ignoreDuplicates: true }
    );

  if (dedupError) {
    // Could not write the dedup record -- do NOT send the notification.
    // Sending without a dedup record means we'd re-notify on every
    // future trigger for this same (alert, candidate) pair.
    console.error(
      `[match-alerts] failed to write dedup record for alert ${alert.id} / candidate ${candidateId} -- skipping notification to avoid duplicate storm:`,
      dedupError
    );
    return;
  }

  await notifyUser(supabase, {
    userId: alert.owner_id,
    type: "match_alert",
    title: alert.label ? `New match for "${alert.label}"` : "New candidate matches your alert",
    body: "A candidate matching your saved criteria just joined Hdenta.",
    link: "/owner/browse",
    email: {
      subject: "A new candidate matches your Hdenta alert",
      html: `<p>Good news -- a candidate matching your saved alert${
        alert.label ? ` "<strong>${alert.label}</strong>"` : ""
      } just joined Hdenta.</p><p><a href="${process.env.NEXT_PUBLIC_SITE_URL ?? ""}/owner/browse">View them on Hdenta</a></p>`,
    },
  });
}
