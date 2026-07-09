import { NextRequest, NextResponse } from "next/server";
import { Webhook } from "standardwebhooks";
import { createServiceClient } from "@/lib/supabase/server";
import { applyDodoEntitlement } from "@/lib/dodo/apply-entitlement";
import type { CheckoutKind } from "@/lib/dodo/server";

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
      await applyDodoEntitlement(supabase, userId, kind as CheckoutKind, {
        dodoCustomerId: payload.data.customer_id,
        dodoPaymentId: payload.data.payment_id,
      });
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
