import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getDodoClient, DODO_PRODUCT_IDS, type CheckoutKind } from "@/lib/dodo/server";

/**
 * POST /api/checkout
 *
 * Provider-agnostic route name on purpose -- the UI (PricingModal,
 * billing page) calls this endpoint, not /api/dodo/checkout, so a
 * future swap back to Stripe or to any other provider only requires
 * changing what happens inside this file, not every call site across
 * the app. See src/lib/dodo/server.ts for the rationale on why Dodo
 * is being used as a temporary substitute for Stripe.
 *
 * body: { kind: "standard" | "pro" | "credits_10" | "credits_25" }
 *
 * Subscriptions (standard/pro) and one-time credit packs both go
 * through Dodo's Checkout Sessions API, which supports both product
 * types -- there's no separate "mode" parameter to set like Stripe's
 * subscription vs payment mode; that's determined by how the product
 * itself was configured in the Dodo dashboard.
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { kind } = (await request.json()) as { kind: CheckoutKind };
  const productId = DODO_PRODUCT_IDS[kind];

  if (!productId) {
    return NextResponse.json(
      { error: `No Dodo product configured for "${kind}" -- set the matching DODO_PRODUCT_* env var.` },
      { status: 400 }
    );
  }

  const { data: practice } = await supabase
    .from("practice_profiles")
    .select("dodo_customer_id, subscription_tier, practice_name")
    .eq("id", authData.user.id)
    .single();

  if ((kind === "credits_10" || kind === "credits_25") && practice?.subscription_tier !== "pro") {
    return NextResponse.json(
      { error: "Screening credits are only available on the Pro plan." },
      { status: 403 }
    );
  }

  const dodo = getDodoClient();
  const origin = request.headers.get("origin") ?? process.env.NEXT_PUBLIC_SITE_URL ?? "";

  try {
    const session = await dodo.checkoutSessions.create({
      product_cart: [{ product_id: productId, quantity: 1 }],
      customer: practice?.dodo_customer_id
        ? { customer_id: practice.dodo_customer_id }
        : { email: authData.user.email!, name: practice?.practice_name ?? undefined },
      return_url: `${origin}/owner/settings/billing?success=true`,
      metadata: {
        supabase_user_id: authData.user.id,
        kind,
      },
    });

    return NextResponse.json({ url: session.checkout_url });
  } catch (err) {
    console.error("[/api/checkout] Dodo checkout session creation failed:", err);
    return NextResponse.json({ error: "Couldn't start checkout. Please try again." }, { status: 502 });
  }
}
