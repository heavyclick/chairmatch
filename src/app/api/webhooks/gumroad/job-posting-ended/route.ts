import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { fetchGumroadSubscriber } from "@/lib/payments/gumroad";

/**
 * POST /api/webhooks/gumroad/job-posting-ended
 *
 * Mirrors /api/webhooks/gumroad/subscription-ended exactly, but for
 * the Job Postings product. Register this URL as a second
 * resource_subscription in Gumroad for the "subscription_ended" event
 * on the job-postings product.
 *
 * On subscription end:
 *   - Sets job_posting_subscription_active = false
 *   - Pauses all the practice's active job_postings (status → 'paused')
 *     so their content is preserved for reactivation on resubscribe.
 *     "Paused" means hidden from candidates but not deleted.
 *
 * Matched via job_posting_customer_id (set by job-posting-sale handler)
 * rather than payment_customer_id (the main platform subscription's
 * Gumroad id) so the two subscriptions don't interfere with each other.
 */
export async function POST(request: NextRequest) {
  const body = await request.formData();
  const subscriberId = body.get("subscriber_id")?.toString();

  if (!subscriberId) {
    console.warn("[/api/webhooks/gumroad/job-posting-ended] ping with no subscriber_id");
    return NextResponse.json({ received: true });
  }

  try {
    // Verify the subscriber exists via the API before revoking access,
    // same pattern as the main subscription-ended handler. This is
    // less critical than the sale lookup (a real subscription_ended
    // ping rarely needs to be faked) but keeps the pattern consistent.
    const { subscriber } = await fetchGumroadSubscriber(subscriberId);

    if (!subscriber) {
      console.warn("[/api/webhooks/gumroad/job-posting-ended] subscriber not found:", subscriberId);
      return NextResponse.json({ received: true });
    }

    const supabase = createServiceClient();

    // Revoke subscription.
    const { data: practices } = await supabase
      .from("practice_profiles")
      .update({ job_posting_subscription_active: false })
      .eq("job_posting_customer_id", subscriberId)
      .select("id");

    if (!practices || practices.length === 0) {
      console.warn("[/api/webhooks/gumroad/job-posting-ended] no practice found for subscriber:", subscriberId);
      return NextResponse.json({ received: true });
    }

    // Pause active listings for every matched practice (should always
    // be exactly one, but the loop is safe regardless).
    const now = new Date().toISOString();
    for (const practice of practices) {
      const { data: paused } = await supabase
        .from("job_postings")
        .update({ status: "paused", updated_at: now })
        .eq("owner_id", practice.id)
        .eq("status", "active")
        .select("id");

      console.log(
        `[/api/webhooks/gumroad/job-posting-ended] deactivated subscription for ${practice.id}, paused ${paused?.length ?? 0} listing(s)`
      );
    }
  } catch (err) {
    console.error("[/api/webhooks/gumroad/job-posting-ended] failed:", err);
  }

  return NextResponse.json({ received: true });
}
