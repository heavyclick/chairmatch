import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const DAY_MS = 24 * 60 * 60 * 1000;
const FIRST_SHOW_NAV_THRESHOLD = 3; // "after 2-3 menu clicks"
const RESHOW_GAP_EARLY_MS = 10 * DAY_MS; // "1-2 weeks" between early re-shows
const EARLY_PHASE_MAX_SHOWS = 3; // a "few times" before going quiet
const RESHOW_GAP_QUIET_MS = 80 * DAY_MS; // "2-3 months" once in the quiet phase

/**
 * POST /api/share-popup/track-nav
 *
 * Called once per route change from both owner and candidate layouts
 * (see src/components/shared/share-popup-tracker.tsx). Increments the
 * nav-click counter and returns whether the popup should show right
 * now, per the agreed cadence:
 *   1. Never shown yet -> show once nav_count reaches 3.
 *   2. Shown 1-2 times so far -> re-show every ~10 days.
 *   3. Shown 3+ times -> quiet phase, re-show roughly every ~80 days,
 *      indefinitely, until the user shares or dismisses forever.
 * Respects share_popup_dismissed_forever unconditionally.
 *
 * All cadence math lives here, not in the frontend component -- one
 * source of truth, and it's server state so the cadence survives
 * across devices/cleared browser storage.
 */
export async function POST() {
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) {
    return NextResponse.json({ shouldShow: false });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("share_popup_nav_count, share_popup_shown_count, share_popup_last_shown_at, share_popup_dismissed_forever")
    .eq("id", authData.user.id)
    .single();

  if (!profile || profile.share_popup_dismissed_forever) {
    return NextResponse.json({ shouldShow: false });
  }

  const newNavCount = (profile.share_popup_nav_count ?? 0) + 1;
  await supabase.from("profiles").update({ share_popup_nav_count: newNavCount }).eq("id", authData.user.id);

  const shownCount = profile.share_popup_shown_count ?? 0;
  const lastShownAt = profile.share_popup_last_shown_at ? new Date(profile.share_popup_last_shown_at) : null;
  const now = Date.now();

  let shouldShow = false;
  if (shownCount === 0) {
    shouldShow = newNavCount >= FIRST_SHOW_NAV_THRESHOLD;
  } else if (shownCount < EARLY_PHASE_MAX_SHOWS) {
    shouldShow = !lastShownAt || now - lastShownAt.getTime() >= RESHOW_GAP_EARLY_MS;
  } else {
    shouldShow = !lastShownAt || now - lastShownAt.getTime() >= RESHOW_GAP_QUIET_MS;
  }

  return NextResponse.json({ shouldShow });
}
