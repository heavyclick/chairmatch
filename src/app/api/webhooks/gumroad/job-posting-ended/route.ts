import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { fetchGumroadSubscriber } from "@/lib/payments/gumroad";

/**
 * POST /api/webhooks/gumroad/job-posting-ended
 *
 * On subscription end:
 *   - Sets job_posting_subscription_active = false
 *   - Moves all ACTIVE job_postings → status "draft"
 *     (not "paused" — draft means "you wrote this but it's not live",
 *     which is the correct state when a subscription lapses. The owner
 *     can re-subscribe and publish again without re-creating anything.)
 *   - Candidates immediately stop seeing the listings (draft is not
 *     returned by the public /candidate/browse query which filters
 *     status = "active" only)
 */
export async function POST(request: NextRequest) {
  const body = await request.formData();
  const subscriberId = body.get("subscriber_id")?.toString();

  if (!subscriberId) {
    console.warn("[job-posting-ended] ping with no subscriber_id");
    return NextResponse.json({ received: true });
  }

  try {
    const { subscriber } = await fetchGumroadSubscriber(subscriberId);
    if (!subscriber) {
      console.warn("[job-posting-ended] subscriber not found:", subscriberId);
      return NextResponse.json({ received: true });
    }

    const supabase = createServiceClient();

    const { data: practices } = await supabase
      .from("practice_profiles")
      .update({ job_posting_subscription_active: false })
      .eq("job_posting_customer_id", subscriberId)
      .select("id");

    if (!practices || practices.length === 0) {
      console.warn("[job-posting-ended] no practice found for subscriber:", subscriberId);
      return NextResponse.json({ received: true });
    }

    const now = new Date().toISOString();
    for (const practice of practices) {
      // Move active → draft so listings disappear from the candidate feed
      // immediately but the owner's content is fully preserved.
      const { data: reverted } = await supabase
        .from("job_postings")
        .update({ status: "draft", updated_at: now })
        .eq("owner_id", practice.id)
        .eq("status", "active")
        .select("id");

      console.log(
        `[job-posting-ended] subscription lapsed for ${practice.id}, moved ${reverted?.length ?? 0} active listing(s) to draft`
      );
    }
  } catch (err) {
    console.error("[job-posting-ended] error:", err);
  }

  return NextResponse.json({ received: true });
}
