import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import type { CheckoutKind, ActivePaymentProvider } from "@/lib/payments/config";

/**
 * Applies the effect of a successful payment/subscription event to a
 * practice's row -- the actual "unlock" write. Provider-agnostic: both
 * the Gumroad and Lemon Squeezy webhook/confirm routes call this same
 * function, passing which provider actually granted it, so the write
 * itself (and the Pro-tier guard below) can never drift between them.
 *
 * Also called from the dev-only manual unlock route
 * (src/app/api/dev/unlock/route.ts) for testing the unlock flow on
 * localhost, where neither provider's webhook can reach you.
 */
export async function applyEntitlement(
  supabase: SupabaseClient<Database>,
  userId: string,
  kind: CheckoutKind,
  provider: ActivePaymentProvider,
  opts: { customerId?: string | null } = {}
) {
  // PAUSED (AI Pro tier): only "standard" is actually reachable right
  // now -- /api/checkout/route.ts rejects anything else before a
  // checkout is ever created for them. This early return is
  // defense-in-depth for the webhook/confirm entry points into this
  // function -- if a stale/misconfigured product still fired an event
  // for a paused kind, this stops it from silently granting access
  // the checkout flow no longer sells. Remove when Pro is re-enabled.
  if (kind !== "standard") {
    console.warn(`[applyEntitlement] Ignoring "${kind}" -- Pro tier is currently paused.`);
    return;
  }

  await supabase
    .from("practice_profiles")
    .update({
      subscription_tier: kind,
      subscription_renews_at: new Date(Date.now() + 365 * 86400000).toISOString(),
      payment_customer_id: opts.customerId ?? null,
      payment_provider: provider,
    })
    .eq("id", userId);
}
