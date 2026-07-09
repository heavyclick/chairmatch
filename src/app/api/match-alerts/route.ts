import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { checkExistingCandidatesForNewAlert } from "@/lib/match-alerts/check-and-notify";

/**
 * POST /api/match-alerts
 *
 * Registers a standing "notify me when a match appears" request,
 * storing the FULL filter snapshot (role, pay, distance, software,
 * remote, workdays, etc.) rather than just role/city/state -- this is
 * what makes "set specific preferences and get notified" actually
 * mean something. The stored `filters` jsonb mirrors the same
 * BrowseFilters shape /owner/browse already uses, so a future matching
 * job can run the identical filter logic /api/search already has
 * rather than reimplementing matching rules in two places.
 *
 * Actually checking for and notifying on matches is handled by
 * src/lib/match-alerts/check-and-notify.ts -- triggered when a
 * candidate joins/updates (forward direction) and immediately when an
 * alert is created or edited (backward direction, checked below).
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const body = await request.json();
  const { roleSlug, city, state, label, filters } = body;

  let roleId: number | null = null;
  if (roleSlug) {
    const { data: roleRow } = await supabase.from("roles").select("id").eq("slug", roleSlug).maybeSingle();
    roleId = roleRow?.id ?? null;
  }

  const { data: newAlert, error } = await supabase
    .from("match_alerts")
    .insert({
      owner_id: authData.user.id,
      role_id: roleId,
      city: city || null,
      state: state || null,
      label: label || null,
      filters: filters ?? {},
    })
    .select("id")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Check this new alert against everyone who ALREADY exists and
  // already matches -- without this, an alert only ever looks forward
  // at future candidate changes, so someone who joined before the
  // alert was created would never trigger it. Awaited (not
  // fire-and-forget) since Vercel's serverless runtime can kill a
  // background promise the instant the response is sent -- see the
  // same reasoning in /api/candidate/status. Best-effort: a failure
  // here must not fail alert creation itself.
  if (newAlert) {
    try {
      await checkExistingCandidatesForNewAlert(createServiceClient(), newAlert.id);
    } catch (err) {
      console.error("[/api/match-alerts] backward-check against existing candidates failed:", err);
    }
  }

  return NextResponse.json({ success: true });
}

export async function GET() {
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("match_alerts")
    .select("*, role:roles(label)")
    .eq("owner_id", authData.user.id)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // match_alerts.notified_at (a single timestamp from the original
  // design) only ever meant "notified once, ever" -- not meaningful
  // for a standing alert that should keep catching new distinct
  // candidates over time. match_alert_notifications (migration 0006)
  // tracks each (alert, candidate) pair actually notified -- surfacing
  // both a count AND the actual matched candidates here, since a count
  // alone doesn't let an owner see who actually matched without
  // digging elsewhere.
  const alertIds = (data ?? []).map((a) => a.id);
  const matchCounts = new Map<string, number>();
  const matchedCandidatesByAlert = new Map<
    string,
    { id: string; full_name: string; photo_url: string | null; role: { label: string } | null; notified_at: string }[]
  >();

  if (alertIds.length > 0) {
    const { data: notifications } = await supabase
      .from("match_alert_notifications")
      .select("alert_id, candidate_id, notified_at, candidate:candidate_profiles(id, full_name, photo_url, role:roles(label))")
      .in("alert_id", alertIds)
      .order("notified_at", { ascending: false });

    for (const n of notifications ?? []) {
      matchCounts.set(n.alert_id, (matchCounts.get(n.alert_id) ?? 0) + 1);
      const candidate = n.candidate as unknown as {
        id: string; full_name: string; photo_url: string | null; role: { label: string } | null;
      } | null;
      if (candidate) {
        const existing = matchedCandidatesByAlert.get(n.alert_id) ?? [];
        existing.push({ ...candidate, notified_at: n.notified_at });
        matchedCandidatesByAlert.set(n.alert_id, existing);
      }
    }
  }

  const alerts = (data ?? []).map((a) => ({
    ...a,
    match_count: matchCounts.get(a.id) ?? 0,
    matched_candidates: matchedCandidatesByAlert.get(a.id) ?? [],
  }));
  return NextResponse.json({ alerts });
}
