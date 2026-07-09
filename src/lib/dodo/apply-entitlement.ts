import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import type { CheckoutKind } from "@/lib/dodo/server";

/**
 * Applies the effect of a successful Dodo payment/subscription event to a
 * practice's row -- the actual "unlock" write.
 *
 * Pulled out of the webhook handler so the exact same code path can be
 * triggered two ways:
 *   1. The real Dodo webhook (src/app/api/webhooks/dodo/route.ts), once
 *      Dodo can actually reach this app's URL (production, or local dev
 *      tunneled through ngrok/similar with the webhook secret configured).
 *   2. The dev-only manual unlock route (src/app/api/dev/unlock/route.ts),
 *      for testing the unlock flow on localhost where Dodo's servers can't
 *      reach you and there is no webhook secret -- see that route's
 *      comments for why this is safe to ship.
 *
 * Keeping this in one place means the dev fallback can never drift from
 * what production actually does.
 */
export async function applyDodoEntitlement(
  supabase: SupabaseClient<Database>,
  userId: string,
  kind: CheckoutKind,
  opts: { dodoCustomerId?: string | null; dodoPaymentId?: string | null } = {}
) {
  // PAUSED (AI Pro tier): only "standard" is actually reachable right
  // now -- /api/checkout/route.ts rejects "pro"/"credits_10"/
  // "credits_25" before a Dodo session is ever created for them. This
  // early return is defense-in-depth for the OTHER entry point into
  // this function, the Dodo webhook (src/app/api/webhooks/dodo/
  // route.ts) -- if a stale/misconfigured Dodo product still fired an
  // event for one of the paused kinds, this stops it from silently
  // granting Pro access or credits that the checkout flow no longer
  // sells. Un-skip by removing this block when Pro is re-enabled.
  if (kind !== "standard") {
    console.warn(`[applyDodoEntitlement] Ignoring "${kind}" -- Pro tier is currently paused.`);
    return;
  }

  if (kind === "standard") {
    await supabase
      .from("practice_profiles")
      .update({
        subscription_tier: kind,
        subscription_renews_at: new Date(Date.now() + 365 * 86400000).toISOString(),
        dodo_customer_id: opts.dodoCustomerId ?? null,
      })
      .eq("id", userId);
    return;
  }

  // PAUSED (AI Pro tier): unreachable now (see the early return above),
  // kept intact for when Pro is re-enabled.
  // if (kind === "pro") {
  //   await supabase
  //     .from("practice_profiles")
  //     .update({
  //       subscription_tier: kind,
  //       subscription_renews_at: new Date(Date.now() + 365 * 86400000).toISOString(),
  //       dodo_customer_id: opts.dodoCustomerId ?? null,
  //     })
  //     .eq("id", userId);
  //
  //   const { data: practice } = await supabase
  //     .from("practice_profiles")
  //     .select("screening_credit_balance")
  //     .eq("id", userId)
  //     .single();
  //   if ((practice?.screening_credit_balance ?? 0) === 0) {
  //     await supabase
  //       .from("practice_profiles")
  //       .update({ screening_credit_balance: 10 })
  //       .eq("id", userId);
  //   }
  //   return;
  // }
  //
  // if (kind === "credits_10" || kind === "credits_25") {
  //   const packSize = kind === "credits_10" ? 10 : 25;
  //   const pricePaidCents = kind === "credits_10" ? 4500 : 10000;
  //
  //   const { data: practice } = await supabase
  //     .from("practice_profiles")
  //     .select("screening_credit_balance")
  //     .eq("id", userId)
  //     .single();
  //
  //   await supabase
  //     .from("practice_profiles")
  //     .update({ screening_credit_balance: (practice?.screening_credit_balance ?? 0) + packSize })
  //     .eq("id", userId);
  //
  //   await supabase.from("screening_credit_purchases").insert({
  //     owner_id: userId,
  //     pack_size: packSize,
  //     price_paid_cents: pricePaidCents,
  //     dodo_payment_id: opts.dodoPaymentId ?? null,
  //   });
  // }
}
