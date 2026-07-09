import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * GET /api/notifications -- most recent notifications + unread count,
 * for the topbar bell dropdown.
 *
 * PATCH /api/notifications -- mark one (by id) or all (no id) as read.
 */
export async function GET() {
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { data: notifications, error } = await supabase
    .from("notifications")
    .select("*")
    .eq("user_id", authData.user.id)
    .order("created_at", { ascending: false })
    .limit(20);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Counts computed from ALL unread notifications (small/cheap query,
  // since only unread ones), not from the 20-item display list above --
  // otherwise both the total badge and any per-type count (e.g. sidebar
  // match-alert badge) would silently undercount once there are more
  // than 20 notifications total.
  const { data: unread } = await supabase
    .from("notifications")
    .select("type")
    .eq("user_id", authData.user.id)
    .is("read_at", null);

  const unreadByType: Record<string, number> = {};
  for (const n of unread ?? []) {
    unreadByType[n.type] = (unreadByType[n.type] ?? 0) + 1;
  }

  return NextResponse.json({
    notifications: notifications ?? [],
    unreadCount: unread?.length ?? 0,
    unreadByType,
  });
}

export async function PATCH(request: NextRequest) {
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const now = new Date().toISOString();

  let query = supabase.from("notifications").update({ read_at: now }).eq("user_id", authData.user.id);
  if (body.id) {
    query = query.eq("id", body.id);
  } else {
    query = query.is("read_at", null);
  }

  const { error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
