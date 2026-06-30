import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

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
 * Sending the actual notification once a match appears is a
 * background-job concern not yet implemented -- this route only
 * covers registering the request. See README.
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

  const { error } = await supabase.from("match_alerts").insert({
    owner_id: authData.user.id,
    role_id: roleId,
    city: city || null,
    state: state || null,
    label: label || null,
    filters: filters ?? {},
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
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
  return NextResponse.json({ alerts: data });
}
