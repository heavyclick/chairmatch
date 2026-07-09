import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { checkExistingCandidatesForNewAlert } from "@/lib/match-alerts/check-and-notify";

/**
 * PATCH /api/match-alerts/[id] -- edit an existing alert's filters/label.
 * Re-runs the existing-candidates backward-check after saving, since
 * a changed filter set could newly match people it didn't before
 * (same reasoning as a brand-new alert -- see check-and-notify.ts).
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
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

  const { error } = await supabase
    .from("match_alerts")
    .update({
      role_id: roleId,
      city: city || null,
      state: state || null,
      label: label || null,
      filters: filters ?? {},
    })
    .eq("id", id)
    .eq("owner_id", authData.user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  try {
    await checkExistingCandidatesForNewAlert(createServiceClient(), id);
  } catch (err) {
    console.error("[/api/match-alerts/[id]] backward-check after edit failed:", err);
  }

  return NextResponse.json({ success: true });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { error } = await supabase
    .from("match_alerts")
    .delete()
    .eq("id", id)
    .eq("owner_id", authData.user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
