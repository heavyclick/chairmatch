import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

/**
 * GET /api/cron/expire-jobs
 *
 * Nightly cron (see vercel.json) that marks stale listings as expired.
 * Handles two tables:
 *
 *   1. `jobs` (scraped external listings) — expires rows where
 *      posted_date is more than 30 days ago. Same logic as before.
 *
 *   2. `job_postings` (native Hdenta owner listings) — expires rows
 *      where expires_at < now() and status is still 'active'. The
 *      expires_at is set to 30 days after activation when the owner
 *      publishes or reactivates a posting; it doesn't change while
 *      the posting is paused (the cron skips paused rows), so pausing
 *      effectively freezes the clock.
 *
 * Both updates use the service-role client (bypasses RLS) and are
 * intentionally separate queries so a failure in one doesn't block
 * the other.
 *
 * Auth: same Bearer CRON_SECRET pattern as sync-google-ratings.
 */
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const expected = process.env.CRON_SECRET ? `Bearer ${process.env.CRON_SECRET}` : null;

  if (!expected || authHeader !== expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServiceClient();

  // ── 1. Expire scraped external jobs (unchanged logic) ─────────────────────
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
  const { data: expiredExternal, error: externalError } = await supabase
    .from("jobs")
    .update({ status: "expired" })
    .eq("status", "active")
    .lt("posted_date", thirtyDaysAgo)
    .select("id");

  if (externalError) {
    console.error("[/api/cron/expire-jobs] external jobs error:", externalError);
  }

  // ── 2. Expire native job_postings whose expires_at has passed ─────────────
  const now = new Date().toISOString();
  const { data: expiredNative, error: nativeError } = await supabase
    .from("job_postings")
    .update({ status: "expired", updated_at: now })
    .eq("status", "active")
    .lt("expires_at", now)
    .select("id");

  if (nativeError) {
    console.error("[/api/cron/expire-jobs] native job_postings error:", nativeError);
  }

  return NextResponse.json({
    expired_external: expiredExternal?.length ?? 0,
    expired_native: expiredNative?.length ?? 0,
    errors: [
      ...(externalError ? [`external: ${externalError.message}`] : []),
      ...(nativeError ? [`native: ${nativeError.message}`] : []),
    ],
  });
}
