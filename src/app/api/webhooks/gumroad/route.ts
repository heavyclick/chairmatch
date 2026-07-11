import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { fetchGumroadSale, fetchGumroadSubscriber } from "@/lib/payments/gumroad";
import { applyEntitlement } from "@/lib/payments/apply-entitlement";

/**
 * POST /api/webhooks/gumroad
 *
 * Gumroad calls this "Ping," not "webhook" -- register the resource
 * subscriptions this route needs via the one-time curl commands in
 * GUMROAD_SETUP.md (each resource_name needs its own PUT call).
 *
 * CRITICAL: unlike Dodo/Paddle/Lemon Squeezy, Gumroad pings are NOT
 * signed -- there is no header to verify this request actually came
 * from Gumroad (confirmed: Gumroad's own docs and third-party
 * integrations built against this API both note there's no signing
 * secret). Anyone who finds this URL could POST a fake "sale" ping
 * claiming any email/product they like.
 *
 * The mitigation: this handler never trusts ping body fields for
 * anything that grants access. It only ever pulls the `sale_id` (or
 * `subscriber_id`) out of the ping, then makes its own authenticated
 * GET request back to Gumroad's API using OUR access token to fetch
 * the real record. An attacker can fabricate a ping, but they can't
 * make our own authenticated API call return a fake successful sale
 * for an account they don't control -- so the ping is just a "go
 * check" signal, never a source of truth by itself.
 *
 * Payload is x-www-form-urlencoded, not JSON.
 */
export async function POST(request: NextRequest) {
  const body = await request.formData();
  const resourceName = request.nextUrl.searchParams.get("resource_name") ?? "sale";

  const supabase = createServiceClient();

  try {
    if (resourceName === "sale") {
      const saleId = body.get("sale_id")?.toString();
      if (!saleId) return NextResponse.json({ received: true });

      const { sale } = await fetchGumroadSale(saleId);
      if (!sale || sale.refunded || sale.disputed || sale.chargedback) {
        return NextResponse.json({ received: true });
      }

      const userId = sale.url_params?.supabase_user_id;
      if (!userId) {
        console.warn("[/api/webhooks/gumroad] sale ping with no supabase_user_id in url_params:", saleId);
        return NextResponse.json({ received: true });
      }

      await applyEntitlement(supabase, userId, "standard", "gumroad", {
        customerId: sale.subscription_id ?? sale.id,
      });
    } else if (resourceName === "subscription_ended") {
      // The definitive "access should end now" event -- Gumroad's
      // "cancellation" event fires when a buyer cancels but the
      // subscription is typically still entitled until the current
      // period actually lapses, so downgrading is deliberately only
      // wired to subscription_ended here. Worth confirming this
      // matches Gumroad's actual behavior once real subscriptions
      // exist to test against.
      const subscriberId = body.get("subscriber_id")?.toString();
      if (!subscriberId) return NextResponse.json({ received: true });

      const { subscriber } = await fetchGumroadSubscriber(subscriberId);
      if (subscriber) {
        await supabase
          .from("practice_profiles")
          .update({ subscription_tier: "free", subscription_renews_at: null })
          .eq("payment_customer_id", subscriberId);
      }
    }
    // "cancellation" and other registered resource types: acknowledged
    // but intentionally not acted on -- see comment above.
  } catch (err) {
    console.error(`[/api/webhooks/gumroad] handling "${resourceName}" ping failed:`, err);
    // Still 200 -- Gumroad retries hourly for up to 3 hours on
    // non-200, which won't help with a real lookup failure and would
    // just triple-log the same error. Errors here need to be caught
    // from logs, not retries.
  }

  return NextResponse.json({ received: true });
}
