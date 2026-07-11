import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { ACTIVE_PROVIDER } from "@/lib/payments/config";
import { fetchGumroadSale } from "@/lib/payments/gumroad";
import { applyEntitlement } from "@/lib/payments/apply-entitlement";

/**
 * GET /api/checkout/confirm?<whatever the redirect back from checkout carried>
 *
 * Why this exists: relying only on a webhook to flip subscription_tier
 * means a slow, misconfigured, or (for Gumroad specifically) entirely
 * unsigned webhook can leave a practice looking stuck on "free" for a
 * while after a real, successful charge. This route lets the billing
 * page ask the provider directly, synchronously, right after the
 * checkout redirect, instead of only waiting on a webhook.
 *
 * Gumroad: set the product's "Redirect to a URL after purchase" (see
 * GUMROAD_SETUP.md) to this app's billing URL. Gumroad appends
 * purchase info as query params on that redirect -- the sale's id is
 * the one this route actually needs, since everything else gets
 * re-fetched from Gumroad's API rather than trusted from the URL.
 * IMPORTANT: verify empirically what Gumroad actually names that
 * field on a real test purchase (their docs describe the behavior but
 * not each field's exact name) -- this checks a few plausible names
 * defensively, and if none match, the billing page's poll fallback
 * still catches it once the webhook lands, so nothing breaks if this
 * guess is wrong, it just isn't instant in that case.
 *
 * Lemon Squeezy: no confirmed way to get purchase info appended to a
 * plain redirect_url (unlike Gumroad/Dodo) -- this always returns
 * `confirmed: false` for that provider, and the billing page's poll
 * fallback is what actually confirms it once the webhook lands. Worth
 * revisiting if/when Lemon Squeezy becomes the active provider.
 */
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  if (ACTIVE_PROVIDER === "lemonsqueezy") {
    return NextResponse.json({ confirmed: false });
  }

  // gumroad
  const saleId =
    request.nextUrl.searchParams.get("sale_id") ??
    request.nextUrl.searchParams.get("purchase_id") ??
    request.nextUrl.searchParams.get("id");
  if (!saleId) {
    // Not necessarily an error -- Gumroad's redirect may use a field
    // name this route isn't checking for yet (see comment above).
    return NextResponse.json({ confirmed: false });
  }

  let sale: Awaited<ReturnType<typeof fetchGumroadSale>>["sale"];
  try {
    const result = await fetchGumroadSale(saleId);
    sale = result.sale;
  } catch (err) {
    console.error("[/api/checkout/confirm] Gumroad sale lookup failed:", err);
    return NextResponse.json({ error: "Couldn't verify that payment." }, { status: 502 });
  }

  if (!sale || sale.refunded || sale.disputed || sale.chargedback) {
    return NextResponse.json({ confirmed: false });
  }

  // The sale belongs to whoever its url_params says it does, not just
  // whoever happens to be logged in when this route is called --
  // without this check, someone could take a sale_id (visible in
  // browser history or a shared link) and replay it while logged in
  // as a different account to grant themselves someone else's paid
  // entitlement.
  if (sale.url_params?.supabase_user_id !== authData.user.id) {
    return NextResponse.json({ error: "This payment doesn't belong to your account." }, { status: 403 });
  }

  const service = createServiceClient();
  await applyEntitlement(service, authData.user.id, "standard", "gumroad", {
    customerId: sale.subscription_id ?? sale.id,
  });

  return NextResponse.json({ confirmed: true });
}
