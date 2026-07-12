import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { fetchGumroadSubscriber } from "@/lib/payments/gumroad";

/**
 * POST /api/webhooks/gumroad/subscription-ended
 *
 * Registered as its own resource_subscription (see GUMROAD_SETUP.md).
 * See src/app/api/webhooks/gumroad/sale/route.ts for why this is a
 * separate route rather than one shared endpoint reading a
 * `resource_name` query param.
 *
 * This is the definitive "access should end now" event -- Gumroad's
 * "cancellation" event fires when a buyer cancels but the subscription
 * is typically still entitled until the current period actually
 * lapses, so downgrading is deliberately only wired to
 * subscription_ended, not cancellation. Worth confirming this matches
 * Gumroad's actual behavior once a real subscription exists to test
 * a cancellation against.
 */
export async function POST(request: NextRequest) {
  const body = await request.formData();
  const subscriberId = body.get("subscriber_id")?.toString();

  if (!subscriberId) {
    console.warn("[/api/webhooks/gumroad/subscription-ended] ping with no subscriber_id");
    return NextResponse.json({ received: true });
  }

  try {
    const { subscriber } = await fetchGumroadSubscriber(subscriberId);
    if (subscriber) {
      const supabase = createServiceClient();
      await supabase
        .from("practice_profiles")
        .update({ subscription_tier: "free", subscription_renews_at: null })
        .eq("payment_customer_id", subscriberId);
    }
  } catch (err) {
    console.error("[/api/webhooks/gumroad/subscription-ended] failed:", err);
  }

  return NextResponse.json({ received: true });
}
