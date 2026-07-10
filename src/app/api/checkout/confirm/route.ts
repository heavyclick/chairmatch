import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { getDodoClient } from "@/lib/dodo/server";
import { applyDodoEntitlement } from "@/lib/dodo/apply-entitlement";
import type { CheckoutKind } from "@/lib/dodo/server";

/**
 * GET /api/checkout/confirm?payment_id=...  (or ?subscription_id=...)
 *
 * Why this exists: the billing page used to rely entirely on the Dodo
 * webhook (src/app/api/webhooks/dodo/route.ts) to flip subscription_tier
 * in the DB, polling our own DB for up to ~15s after the Dodo redirect
 * hoping the webhook had landed by then. If the webhook is slow, not yet
 * registered in the Dodo dashboard, or misconfigured, that poll times
 * out and the practice stays stuck on "free" despite a real, successful
 * charge -- exactly what was reported.
 *
 * Dodo automatically appends payment_id (one-time) or subscription_id
 * (recurring) and status to return_url on redirect -- see
 * https://docs.dodopayments.com/features/checkout -- so the billing
 * page can hand either straight to this route and get a synchronous
 * answer instead of waiting on a webhook at all. The webhook remains
 * the system of record for events with no browser involved (renewals,
 * cancellations); this only makes the immediate post-checkout redirect
 * instant and reliable. Calling applyDodoEntitlement() twice (once from
 * here, once from the webhook if/when it also fires) is safe -- it's an
 * idempotent UPDATE.
 */
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const paymentId = request.nextUrl.searchParams.get("payment_id");
  const subscriptionId = request.nextUrl.searchParams.get("subscription_id");
  if (!paymentId && !subscriptionId) {
    return NextResponse.json({ error: "Missing payment_id or subscription_id" }, { status: 400 });
  }

  const dodo = getDodoClient();

  let metadata: { supabase_user_id?: string; kind?: string } | undefined;
  let customerId: string | undefined;
  let confirmedPaymentId: string | undefined;
  let succeeded = false;

  try {
    if (paymentId) {
      const payment = await dodo.payments.retrieve(paymentId);
      succeeded = payment.status === "succeeded";
      metadata = payment.metadata;
      customerId = payment.customer?.customer_id;
      confirmedPaymentId = payment.payment_id;
    } else if (subscriptionId) {
      const subscription = await dodo.subscriptions.retrieve(subscriptionId);
      succeeded = subscription.status === "active";
      metadata = subscription.metadata;
      customerId = subscription.customer?.customer_id;
    }
  } catch (err) {
    console.error("[/api/checkout/confirm] Dodo lookup failed:", err);
    return NextResponse.json({ error: "Couldn't verify that payment." }, { status: 502 });
  }

  if (!succeeded) {
    // Not an error -- could still be processing (e.g. a slower payment
    // method, or a subscription that hasn't activated yet). The billing
    // page falls back to its short DB poll in this case.
    return NextResponse.json({ confirmed: false });
  }

  // The payment/subscription belongs to whoever its metadata says it
  // does, not just whoever happens to be logged in when this route is
  // called -- without this check, someone could take a payment_id
  // (visible in browser history or a shared link) and replay it while
  // logged in as a different account to grant themselves someone
  // else's paid entitlement.
  if (metadata?.supabase_user_id !== authData.user.id) {
    return NextResponse.json({ error: "This payment doesn't belong to your account." }, { status: 403 });
  }

  const kind = metadata?.kind as CheckoutKind | undefined;
  if (!kind) {
    return NextResponse.json({ error: "Payment is missing plan metadata." }, { status: 502 });
  }

  const service = createServiceClient();
  await applyDodoEntitlement(service, authData.user.id, kind, {
    dodoCustomerId: customerId,
    dodoPaymentId: confirmedPaymentId,
  });

  return NextResponse.json({ confirmed: true });
}
