import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getStripe, STRIPE_PRICE_IDS } from "@/lib/stripe/server";

type CheckoutKind = "standard" | "pro" | "credits_10" | "credits_25";

/**
 * POST /api/stripe/checkout
 * body: { kind: "standard" | "pro" | "credits_10" | "credits_25" }
 *
 * Subscriptions (standard/pro) use Stripe Checkout in `subscription`
 * mode with annual recurring prices. Credit packs use `payment` mode
 * (one-time). Screening credits are Pro-exclusive by product design --
 * enforced here, not just hidden in the UI, since a determined Standard
 * user could otherwise hit this endpoint directly.
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { kind } = (await request.json()) as { kind: CheckoutKind };
  const priceId = STRIPE_PRICE_IDS[kind];

  if (!priceId) {
    return NextResponse.json(
      { error: `No Stripe price configured for "${kind}" -- set the matching STRIPE_PRICE_* env var.` },
      { status: 400 }
    );
  }

  const stripe = getStripe();

  const { data: practice } = await supabase
    .from("practice_profiles")
    .select("stripe_customer_id, subscription_tier")
    .eq("id", authData.user.id)
    .single();

  if ((kind === "credits_10" || kind === "credits_25") && practice?.subscription_tier !== "pro") {
    return NextResponse.json(
      { error: "Screening credits are only available on the Pro plan." },
      { status: 403 }
    );
  }

  let customerId = practice?.stripe_customer_id;
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: authData.user.email,
      metadata: { supabase_user_id: authData.user.id },
    });
    customerId = customer.id;
    await supabase
      .from("practice_profiles")
      .update({ stripe_customer_id: customerId })
      .eq("id", authData.user.id);
  }

  const isSubscription = kind === "standard" || kind === "pro";
  const origin = request.headers.get("origin") ?? process.env.NEXT_PUBLIC_SITE_URL ?? "";

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: isSubscription ? "subscription" : "payment",
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${origin}/owner/settings/billing?success=true`,
    cancel_url: `${origin}/owner/settings/billing?canceled=true`,
    metadata: {
      supabase_user_id: authData.user.id,
      kind,
    },
  });

  return NextResponse.json({ url: session.url });
}
