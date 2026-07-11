import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { verifyLemonSqueezySignature, type LemonSqueezyWebhookPayload } from "@/lib/payments/lemonsqueezy";
import { applyEntitlement } from "@/lib/payments/apply-entitlement";

/**
 * POST /api/webhooks/lemonsqueezy
 *
 * Only exercised when PAYMENT_PROVIDER=lemonsqueezy (see
 * src/lib/payments/config.ts). Unlike Gumroad, Lemon Squeezy signs
 * every webhook (X-Signature, HMAC-SHA256) so this can trust the body
 * once verified, rather than needing to re-fetch from their API the
 * way the Gumroad handler does.
 */
export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  const signature = request.headers.get("x-signature");

  if (!verifyLemonSqueezySignature(rawBody, signature)) {
    console.error("[/api/webhooks/lemonsqueezy] signature verification failed");
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const payload = JSON.parse(rawBody) as LemonSqueezyWebhookPayload;
  const supabase = createServiceClient();
  const userId = payload.meta.custom_data?.supabase_user_id;

  switch (payload.meta.event_name) {
    case "order_created":
    case "subscription_created":
    case "subscription_updated": {
      if (payload.data.attributes.status && !["active", "on_trial"].includes(payload.data.attributes.status)) break;
      if (!userId) break;
      await applyEntitlement(supabase, userId, "standard", "lemonsqueezy", {
        customerId: payload.data.attributes.customer_id?.toString() ?? payload.data.id,
      });
      break;
    }

    case "subscription_expired": {
      const customerId = payload.data.attributes.customer_id?.toString();
      if (customerId) {
        await supabase
          .from("practice_profiles")
          .update({ subscription_tier: "free", subscription_renews_at: null })
          .eq("payment_customer_id", customerId);
      }
      break;
    }

    // subscription_cancelled intentionally not handled here -- Lemon
    // Squeezy's convention is that a cancelled subscription stays
    // entitled until its current period actually lapses
    // (subscription_expired), same reasoning as the Gumroad handler.

    default:
      break;
  }

  return NextResponse.json({ received: true });
}
