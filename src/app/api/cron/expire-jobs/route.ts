import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

/**
 * GET /api/cron/expire-jobs
 *
 * Marks any job posted more than 30 days ago as expired, so stale
 * external listings stop showing in Browse Jobs without needing to be
 * deleted outright (kept for record-keeping, just excluded by the
 * "status = 'active'" filter every read query and RLS policy already
 * uses). Run nightly via Vercel Cron -- see vercel.json at the repo
 * root. Same Bearer-CRON_SECRET auth pattern as
 * src/app/api/cron/sync-google-ratings/route.ts.
 *
 * Test locally with:
 *   curl -H "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/cron/expire-jobs
 */
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const expected = process.env.CRON_SECRET ? `Bearer ${process.env.CRON_SECRET}` : null;

  if (!expected || authHeader !== expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServiceClient();
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);

  const { data, error } = await supabase
    .from("jobs")
    .update({ status: "expired" })
    .eq("status", "active")
    .lt("posted_date", thirtyDaysAgo)
    .select("id");

  if (error) {
    console.error("[/api/cron/expire-jobs] failed:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ expired: data?.length ?? 0 });
}
