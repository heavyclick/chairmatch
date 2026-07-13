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
 * CONFIRMED BEHAVIOR (via diagnostic logging against a real sale):
 * Gumroad's GET /v2/sales/:id API endpoint does NOT reliably return
 * custom url_params -- but the ping body itself does, correctly,
 * every time, as form-encoded `url_params[key]` fields. So
 * supabase_user_id is read directly from the ping body below, not
 * from the API lookup. The API lookup is still used afterward, but
 * only for what it's actually reliable for: verifying the sale isn't
 * refunded/disputed/chargedback/a Gumroad-internal test purchase
 * before granting anything.
 *
 * CRITICAL: Gumroad pings are NOT signed -- see
 * src/lib/payments/gumroad.ts for the full explanation. The
 * supabase_user_id below comes from the unsigned ping body, so it
 * alone isn't proof of payment -- the API lookup right after is what
 * actually confirms this sale is real and unrefunded, using OUR OWN
 * access token, before anything gets granted.
 *
 * Payload is x-www-form-urlencoded, not JSON.
 */
export async function POST(request: NextRequest) {
  const body = await request.formData();
  const saleId = body.get("sale_id")?.toString();
  const userId = body.get("url_params[supabase_user_id]")?.toString();

  if (!saleId || !userId) {
    console.warn(`[/api/webhooks/gumroad/sale] ping missing sale_id or supabase_user_id (sale_id: ${saleId ?? "none"})`);
    return NextResponse.json({ received: true });
  }

  try {
    const { sale } = await fetchGumroadSale(saleId);
    if (!sale || sale.refunded || sale.disputed || sale.chargedback) {
      return NextResponse.json({ received: true });
    }

    // Gumroad's own "logged in as creator" test-purchase flow sets this
    // -- explicitly excluded from the normal sales dashboard per
    // Gumroad's own docs, and shouldn't grant real access either.
    // Legitimate testing goes through a real (even $0, discount-coded)
    // checkout instead, which has test: false.
    if (sale.test) {
      console.log("[/api/webhooks/gumroad/sale] ignoring Gumroad's own test-purchase ping:", saleId);
      return NextResponse.json({ received: true });
    }

    const supabase = createServiceClient();
    await applyEntitlement(supabase, userId, "standard", "gumroad", {
      customerId: sale.subscription_id ?? sale.id,
    });
    console.log("[/api/webhooks/gumroad/sale] granted standard:", userId);
  } catch (err) {
    console.error("[/api/webhooks/gumroad/sale] failed:", err);
    // Still 200 -- Gumroad retries hourly for up to 3 hours on
    // non-200, which won't help with a real lookup failure and would
    // just triple-log the same error. Errors here need to be caught
    // from logs, not retries.
  }

  return NextResponse.json({ received: true });
}
