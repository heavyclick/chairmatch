import { NextRequest, NextResponse } from "next/server";
import { Webhook } from "standardwebhooks";
import { createServiceClient } from "@/lib/supabase/server";

/**
 * POST /api/webhooks/dodo
 *
 * Dodo Payments follows the Standard Webhooks spec (the `standardwebhooks`
 * package verifies signatures using the webhook-id/webhook-signature/
 * webhook-timestamp headers) -- structurally similar to Stripe's webhook
 * verification but with a different header scheme and a different
 * payload shape, hence a full rewrite rather than a search-and-replace
 * on the old Stripe handler.
 *
 * Uses the service-role Supabase client (bypasses RLS) because this
 * runs with no user session -- Dodo is calling us directly. This is
 * the one place in the app where bypassing RLS is correct.
 *
 * Register this endpoint's URL in the Dodo Payments dashboard
 * (Settings -> Webhooks). For local testing, use ngrok or similar
 * since Dodo can't reach localhost directly.
 */
export async function POST(request: NextRequest) {
  if (!process.env.DODO_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "DODO_WEBHOOK_SECRET is not set" }, { status: 500 });
  }

  const webhook = new Webhook(process.env.DODO_WEBHOOK_SECRET);
  const rawBody = await request.text();

  const webhookHeaders = {
    "webhook-id": request.headers.get("webhook-id") ?? "",
    "webhook-signature": request.headers.get("webhook-signature") ?? "",
    "webhook-timestamp": request.headers.get("webhook-timestamp") ?? "",
  };

  let payload: {
    type: string;
    data: {
      payload_type?: string;
      customer_id?: string;
      subscription_id?: string;
      payment_id?: string;
      metadata?: { supabase_user_id?: string; kind?: string };
      status?: string;
    };
  };

  try {
    await webhook.verify(rawBody, webhookHeaders);
    payload = JSON.parse(rawBody);
  } catch (err) {
    console.error("[/api/webhooks/dodo] signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const supabase = createServiceClient();
  const userId = payload.data.metadata?.supabase_user_id;
  const kind = payload.data.metadata?.kind;

  switch (payload.type) {
    case "payment.succeeded":
    case "subscription.active": {
      if (!userId || !kind) break;

      if (kind === "standard" || kind === "pro") {
        await supabase
          .from("practice_profiles")
          .update({
            subscription_tier: kind,
            subscription_renews_at: new Date(Date.now() + 365 * 86400000).toISOString(),
            dodo_customer_id: payload.data.customer_id ?? null,
          })
          .eq("id", userId);

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
          dodo_payment_id: payload.data.payment_id ?? null,
        });
      }
      break;
    }

    case "subscription.cancelled":
    case "subscription.expired": {
      const customerId = payload.data.customer_id;
      if (customerId) {
        await supabase
          .from("practice_profiles")
          .update({ subscription_tier: "free", subscription_renews_at: null })
          .eq("dodo_customer_id", customerId);
      }
      break;
    }

    default:
      // Unhandled event types are expected and fine to ignore.
      break;
  }

  return NextResponse.json({ received: true });
}
