import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { syncGoogleRatingForPractice } from "@/lib/google-rating/sync";

/**
 * GET /api/cron/sync-google-ratings
 *
 * Re-fetches every practice's Google rating on a schedule, so a
 * listing's stars/review count stay current without an owner needing
 * to remember to click "Refresh rating" -- run weekly (every Sunday)
 * via Vercel Cron, see vercel.json at the repo root. Vercel Cron
 * requests carry an `Authorization: Bearer $CRON_SECRET` header
 * automatically when CRON_SECRET is set as an env var in your Vercel
 * project -- this route checks for that exact header so it can't be
 * triggered by anyone hitting the URL directly.
 *
 * NOTE: this route does nothing on its own in local dev or if deployed
 * without Vercel Cron configured -- cron scheduling is Vercel's
 * infrastructure, not something this route provides by itself. Test it
 * locally with:
 *   curl -H "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/cron/sync-google-ratings
 *
 * Runs sequentially with a small delay between practices rather than
 * in parallel, out of respect for Serper's own rate limits per key --
 * with multiple SERPER_API_KEYS configured this is conservative, but
 * safe regardless of how many keys are set.
 */
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const expected = process.env.CRON_SECRET ? `Bearer ${process.env.CRON_SECRET}` : null;

  if (!expected) {
    return NextResponse.json({ error: "CRON_SECRET is not configured." }, { status: 500 });
  }
  if (authHeader !== expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServiceClient();
  const { data: practices } = await supabase
    .from("practice_profiles")
    .select("id")
    .not("google_review_url", "is", null);

  if (!practices || practices.length === 0) {
    return NextResponse.json({ synced: 0, failed: 0 });
  }

  let synced = 0;
  let failed = 0;
  const failures: { id: string; error: string }[] = [];

  for (const practice of practices) {
    try {
      const result = await syncGoogleRatingForPractice(supabase, practice.id);
      if ("error" in result) {
        failed++;
        failures.push({ id: practice.id, error: result.error });
      } else {
        synced++;
      }
    } catch (err) {
      failed++;
      failures.push({ id: practice.id, error: err instanceof Error ? err.message : String(err) });
    }
    // Small pause between requests -- see file comment above.
    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  if (failures.length > 0) {
    console.error("[cron/sync-google-ratings] failures:", failures);
  }

  return NextResponse.json({ synced, failed, total: practices.length });
}
