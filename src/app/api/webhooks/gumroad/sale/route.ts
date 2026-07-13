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

  // DIAGNOSTIC: log every field Gumroad actually put in the ping body.
  // Gumroad's docs say custom url_params ride along in the ping itself
  // (not just retrievable via the sales API afterward) -- if
  // supabase_user_id (or a url_params[...]-prefixed version of it)
  // shows up HERE but not in the API lookup below, that tells us
  // exactly where it's being lost. Remove once this is resolved.
  const rawBodyEntries: Record<string, string> = {};
  for (const [key, value] of body.entries()) {
    rawBodyEntries[key] = value.toString();
  }
  console.log("[/api/webhooks/gumroad/sale] RAW PING BODY:", JSON.stringify(rawBodyEntries));

  if (!saleId) {
    console.warn("[/api/webhooks/gumroad/sale] ping with no sale_id");
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

    let userId = sale.url_params?.supabase_user_id;

    // Fallback: Gumroad's docs say custom url_params ride in the ping
    // body itself, form-encoded as `url_params[key]` -- if the API
    // lookup above doesn't have it but the original ping did, use that
    // instead of giving up. This may turn out to be the actual fix
    // rather than just a diagnostic, depending on what the logging
    // above reveals.
    if (!userId) {
      userId = rawBodyEntries["url_params[supabase_user_id]"] || undefined;
      if (userId) {
        console.log("[/api/webhooks/gumroad/sale] recovered supabase_user_id from raw ping body instead of API lookup:", saleId);
      }
    }

    if (!userId) {
      // DIAGNOSTIC: full sale object, not just the warning -- this is
      // what /v2/sales/:id actually returned, so we can see every key
      // it has (in case url_params exists under a different shape than
      // expected, or is missing entirely from this endpoint's response).
      console.warn("[/api/webhooks/gumroad/sale] no supabase_user_id in url_params:", saleId);
      console.warn("[/api/webhooks/gumroad/sale] FULL SALE OBJECT:", JSON.stringify(sale));
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
