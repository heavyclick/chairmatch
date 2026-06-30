import { NextRequest, NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe/server";
import { createServiceClient } from "@/lib/supabase/server";
import type Stripe from "stripe";

/**
 * POST /api/stripe/webhook
 *
 * Uses the service-role Supabase client (bypasses RLS) because this
 * runs with no user session -- Stripe is calling us directly, not a
 * logged-in browser. This is the ONE place in the app where bypassing
 * RLS is correct; never reuse this pattern in a user-facing route.
 *
 * Register this endpoint's URL in the Stripe dashboard (or via
 * `stripe listen --forward-to localhost:3000/api/stripe/webhook` for
 * local testing) and copy the signing secret into
 * STRIPE_WEBHOOK_SECRET.
 */
export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get("stripe-signature");

  if (!signature || !process.env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Missing signature or webhook secret" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(body, signature, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    return NextResponse.json(
      { error: `Webhook signature verification failed: ${err instanceof Error ? err.message : "unknown error"}` },
      { status: 400 }
    );
  }

  const supabase = createServiceClient();

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const userId = session.metadata?.supabase_user_id;
      const kind = session.metadata?.kind;
      if (!userId || !kind) break;

      if (kind === "standard" || kind === "pro") {
        await supabase
          .from("practice_profiles")
          .update({
            subscription_tier: kind,
            subscription_renews_at: new Date(Date.now() + 365 * 86400000).toISOString(),
          })
          .eq("id", userId);

        // Pro includes a starter bank of screening credits on first
        // subscribe -- see build doc Section 8 ("Includes a starting
        // bank of screening credits").
        if (kind === "pro") {
          const { data: practice } = await supabase
            .from("practice_profiles")
            .select("screening_credit_balance")
            .eq("id", userId)
            .single();
          if ((practice?.screening_credit_balance ?? 0) === 0) {
            await supabase
              .from("practice_profiles")
              .update({ screening_credit_balance: 10 })
              .eq("id", userId);
          }
        }
      }

      if (kind === "credits_10" || kind === "credits_25") {
        const packSize = kind === "credits_10" ? 10 : 25;
        const pricePaidCents = kind === "credits_10" ? 4500 : 10000;

        const { data: practice } = await supabase
          .from("practice_profiles")
          .select("screening_credit_balance")
          .eq("id", userId)
          .single();

        await supabase
          .from("practice_profiles")
          .update({ screening_credit_balance: (practice?.screening_credit_balance ?? 0) + packSize })
          .eq("id", userId);

        await supabase.from("screening_credit_purchases").insert({
          owner_id: userId,
          pack_size: packSize,
          price_paid_cents: pricePaidCents,
          stripe_payment_intent_id: session.payment_intent as string | null,
        });
      }
      break;
    }

    case "customer.subscription.deleted": {
      const subscription = event.data.object as Stripe.Subscription;
      const customerId = subscription.customer as string;

      await supabase
        .from("practice_profiles")
        .update({ subscription_tier: "free", subscription_renews_at: null })
        .eq("stripe_customer_id", customerId);
      break;
    }

    case "customer.subscription.updated": {
      const subscription = event.data.object as Stripe.Subscription;
      const customerId = subscription.customer as string;

      if (subscription.status !== "active") {
        await supabase
          .from("practice_profiles")
          .update({ subscription_tier: "free" })
          .eq("stripe_customer_id", customerId);
      }
      break;
    }

    default:
      // Unhandled event types are expected and fine to ignore --
      // Stripe sends many events we don't act on.
      break;
  }

  return NextResponse.json({ received: true });
}
