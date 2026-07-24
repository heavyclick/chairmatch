import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { verifyLemonSqueezySignature, type LemonSqueezyWebhookPayload } from "@/lib/payments/lemonsqueezy";

/**
 * POST /api/webhooks/lemonsqueezy/job-posting
 *
 * Handles LemonSqueezy subscription events for the $50/month Job
 * Postings product -- separate from the main /api/webhooks/lemonsqueezy
 * handler (which manages the core platform Standard subscription) so
 * the two products' lifecycles don't interfere with each other.
 *
 * Configure this URL in your LemonSqueezy dashboard as the webhook
 * endpoint for the Job Postings product specifically (you can scope
 * webhooks to individual products in LS).
 *
 * Events handled:
 *   subscription_created / subscription_updated (status: active/on_trial)
 *     → set job_posting_subscription_active = true
 *
 *   subscription_expired / subscription_cancelled (past period end)
 *     → set job_posting_subscription_active = false
 *     → pause all the practice's active job_postings (not delete --
 *        their work is preserved so they can reactivate on resubscribe)
 *
 * The supabase_user_id must be passed as custom_data when creating the
 * checkout, same pattern as the existing platform subscription:
 *   { custom_data: { supabase_user_id: "<uuid>" } }
 */
export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  const signature = request.headers.get("x-signature");

  if (!verifyLemonSqueezySignature(rawBody, signature)) {
    console.error("[/api/webhooks/lemonsqueezy/job-posting] signature verification failed");
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const payload = JSON.parse(rawBody) as LemonSqueezyWebhookPayload;
  const supabase = createServiceClient();
  const userId = payload.meta.custom_data?.supabase_user_id;

  if (!userId) {
    // Can't do anything without a user ID -- log but return 200 so
    // LemonSqueezy doesn't keep retrying a webhook we can't handle.
    console.error("[/api/webhooks/lemonsqueezy/job-posting] no supabase_user_id in custom_data");
    return NextResponse.json({ received: true });
  }

  const eventName = payload.meta.event_name;

  switch (eventName) {
    case "subscription_created":
    case "subscription_updated": {
      const status = payload.data.attributes.status;
      if (!status || !["active", "on_trial"].includes(status)) break;

      await supabase
        .from("practice_profiles")
        .update({
          job_posting_subscription_active: true,
          job_posting_subscription_started_at: new Date().toISOString(),
        })
        .eq("id", userId);

      console.log(`[job-posting webhook] activated subscription for ${userId}`);
      break;
    }

    case "subscription_expired": {
      // Period actually lapsed -- deactivate and pause active listings.
      await supabase
        .from("practice_profiles")
        .update({ job_posting_subscription_active: false })
        .eq("id", userId);

      // Pause active listings -- 'paused' means hidden from candidates
      // but not deleted, so they can reactivate cleanly on resubscribe.
      const now = new Date().toISOString();
      const { data: paused } = await supabase
        .from("job_postings")
        .update({ status: "paused", updated_at: now })
        .eq("owner_id", userId)
        .eq("status", "active")
        .select("id");

      console.log(
        `[job-posting webhook] deactivated subscription for ${userId}, paused ${paused?.length ?? 0} listing(s)`
      );
      break;
    }

    case "subscription_cancelled":
      // Cancelled but not yet expired -- entitlement stays active until
      // subscription_expired fires at the actual period end. Same
      // convention as the main platform webhook handler. No action needed.
      console.log(`[job-posting webhook] subscription_cancelled for ${userId} — no action until period end`);
      break;

    default:
      break;
  }

  return NextResponse.json({ received: true });
}
