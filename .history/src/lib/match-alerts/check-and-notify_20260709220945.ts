import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { fetchCandidateForMatching, candidateMatchesFilters, type AlertFilters } from "@/lib/candidate-search/match-filters";
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

    const filters = (alert.filters ?? {}) as AlertFilters;
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
  await supabase.from("match_alert_notifications").insert({
    alert_id: alert.id,
    candidate_id: candidateId,
  });

  await notifyUser(supabase, {
    userId: alert.owner_id,
    type: "match_alert",
    title: alert.label ? `New match for "${alert.label}"` : "New candidate matches your alert",
    body: "A candidate matching your saved criteria just joined ChairMatch.",
    link: "/owner/browse",
    email: {
      subject: "A new candidate matches your ChairMatch alert",
      html: `<p>Good news -- a candidate matching your saved alert${
        alert.label ? ` "<strong>${alert.label}</strong>"` : ""
      } just joined ChairMatch.</p><p><a href="${process.env.NEXT_PUBLIC_SITE_URL ?? ""}/owner/browse">View them on ChairMatch</a></p>`,
    },
  });
}
