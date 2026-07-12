import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { fetchGumroadSale } from "@/lib/payments/gumroad";
import { applyEntitlement } from "@/lib/payments/apply-entitlement";

/**
 * POST /api/webhooks/gumroad/sale
 *
 * Registered as its own resource_subscription (see GUMROAD_SETUP.md) --
 * split into a dedicated route rather than one shared /api/webhooks/
 * gumroad endpoint dispatching on a `resource_name` query param, which
 * was the original design here and had a real bug: Gumroad's PUT
 * /v2/resource_subscriptions registration never had that query param
 * appended to post_url, so every ping (sale AND subscription_ended
 * both) silently fell through to the "sale" branch regardless of
 * which one it actually was. A distinct URL per event type removes
 * that whole bug class rather than requiring the query param to be
 * remembered correctly at registration time.
 *
 * CRITICAL: Gumroad pings are NOT signed -- see
 * src/lib/payments/gumroad.ts for the full explanation. This handler
 * never trusts the ping body for anything that grants access; it only
 * pulls sale_id out of it, then re-fetches the authoritative record
 * from Gumroad's API using our own access token.
 *
 * Payload is x-www-form-urlencoded, not JSON.
 */
export async function POST(request: NextRequest) {
  const body = await request.formData();
  const saleId = body.get("sale_id")?.toString();

  if (!saleId) {
    console.warn("[/api/webhooks/gumroad/sale] ping with no sale_id");
    return NextResponse.json({ received: true });
  }

  try {
    const { sale } = await fetchGumroadSale(saleId);
    if (!sale || sale.refunded || sale.disputed || sale.chargedback) {
      return NextResponse.json({ received: true });
    }

    const userId = sale.url_params?.supabase_user_id;
    if (!userId) {
      console.warn("[/api/webhooks/gumroad/sale] no supabase_user_id in url_params:", saleId);
      return NextResponse.json({ received: true });
    }

    const supabase = createServiceClient();
    await applyEntitlement(supabase, userId, "standard", "gumroad", {
      customerId: sale.subscription_id ?? sale.id,
    });
  } catch (err) {
    console.error("[/api/webhooks/gumroad/sale] failed:", err);
    // Still 200 -- Gumroad retries hourly for up to 3 hours on
    // non-200, which won't help with a real lookup failure and would
    // just triple-log the same error. Errors here need to be caught
    // from logs, not retries.
  }

  return NextResponse.json({ received: true });
}
