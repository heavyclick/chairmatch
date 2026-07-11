import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { ACTIVE_PROVIDER, type CheckoutKind } from "@/lib/payments/config";
import { buildGumroadCheckoutUrl } from "@/lib/payments/gumroad";
import { createLemonSqueezyCheckout } from "@/lib/payments/lemonsqueezy";

/**
 * POST /api/checkout
 *
 * Provider-agnostic route name on purpose -- the UI (PricingModal,
 * billing page) calls this endpoint, not /api/gumroad/checkout, so
 * switching providers (see src/lib/payments/config.ts) only requires
 * changing what happens inside this file, not every call site.
 *
 * Gumroad has no dynamic "create session" API -- the checkout URL is
 * just a link to a pre-made product with query params attached (see
 * src/lib/payments/gumroad.ts). Lemon Squeezy does create a fresh
 * checkout per request, closer to how the old Dodo integration worked.
 * Both branches return the same { url } shape so the client doesn't
 * need to know which provider is active.
 *
 * body: { kind: "standard" }
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { kind } = (await request.json()) as { kind: CheckoutKind };

  // PAUSED (AI Pro tier): only "standard" is purchasable right now --
  // see src/lib/payments/apply-entitlement.ts for the matching guard
  // on the fulfillment side.
  if (kind !== "standard") {
    return NextResponse.json({ error: "That plan isn't available yet." }, { status: 400 });
  }

  const origin = request.headers.get("origin") ?? process.env.NEXT_PUBLIC_SITE_URL ?? "";

  try {
    if (ACTIVE_PROVIDER === "gumroad") {
      const url = buildGumroadCheckoutUrl({
        userId: authData.user.id,
        email: authData.user.email!,
      });
      return NextResponse.json({ url });
    }

    // lemonsqueezy
    const url = await createLemonSqueezyCheckout({
      userId: authData.user.id,
      email: authData.user.email!,
      returnUrl: `${origin}/owner/settings/billing?success=true&provider=lemonsqueezy`,
    });
    return NextResponse.json({ url });
  } catch (err) {
    console.error(`[/api/checkout] ${ACTIVE_PROVIDER} checkout creation failed:`, err);
    return NextResponse.json({ error: "Couldn't start checkout. Please try again." }, { status: 502 });
  }
}
