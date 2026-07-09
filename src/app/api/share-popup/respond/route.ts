import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * POST /api/share-popup/respond
 * body: { action: "shared" | "dismissed" | "dont_show_again" }
 *
 * "shared" and "dont_show_again" both stop the popup forever --
 * sharing means the goal was already accomplished, no reason to keep
 * asking. "dismissed" (closed without sharing) just records that this
 * was shown, so /api/share-popup/track-nav's cadence math re-shows it
 * later per the normal schedule.
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { action } = await request.json();
  if (!["shared", "dismissed", "dont_show_again"].includes(action)) {
    return NextResponse.json({ error: "Invalid action." }, { status: 400 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("share_popup_shown_count")
    .eq("id", authData.user.id)
    .single();

  await supabase
    .from("profiles")
    .update({
      share_popup_shown_count: (profile?.share_popup_shown_count ?? 0) + 1,
      share_popup_last_shown_at: new Date().toISOString(),
      share_popup_dismissed_forever: action === "shared" || action === "dont_show_again",
    })
    .eq("id", authData.user.id);

  return NextResponse.json({ success: true });
}
