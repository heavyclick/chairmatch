import DodoPayments from "dodopayments";

/**
 * Server-only Dodo Payments client. Never import this into a Client
 * Component.
 *
 * NOTE -- this is an explicit, temporary substitute for Stripe per the
 * founder's direction: Dodo Payments is being used now because it
 * doesn't require the same business verification/setup overhead Stripe
 * does at this stage. The plan is to migrate back to Stripe (or to
 * whichever provider makes sense) once the business has what Stripe
 * requires. Because of that, this integration is intentionally kept
 * thin and isolated to this lib/dodo/ folder plus the two route files
 * that call it (src/app/api/checkout/route.ts and
 * src/app/api/webhooks/dodo/route.ts) -- swapping providers again later
 * should mean touching only those files, not anything in the UI layer,
 * which all calls a provider-agnostic /api/checkout endpoint rather
 * than a Dodo- or Stripe-specific one.
 *
 * Pricing reference (see build doc Section 8, unchanged by this swap):
 * - Standard: $100/yr flat
 * - Pro: $250/yr flat, includes a starter bank of screening credits
 * - Screening credits: $5 each, sold in packs of 10 ($45) or 25 ($100)
 *
 * Product IDs below are read from env vars so they can point at Dodo's
 * test-mode products during development and live products in
 * production without a code change. Create these products in the Dodo
 * Payments dashboard first (Standard/Pro as recurring subscription
 * products, credit packs as one-time products).
 */
let _dodo: DodoPayments | null = null;

export function getDodoClient(): DodoPayments {
  if (!process.env.DODO_PAYMENTS_API_KEY) {
    throw new Error(
      "DODO_PAYMENTS_API_KEY is not set. Add it to .env.local before using billing features."
    );
  }
  if (!_dodo) {
    _dodo = new DodoPayments({
      bearerToken: process.env.DODO_PAYMENTS_API_KEY,
      environment: process.env.DODO_PAYMENTS_ENVIRONMENT === "live_mode" ? "live_mode" : "test_mode",
    });
  }
  return _dodo;
}

export const DODO_PRODUCT_IDS = {
  standard: process.env.DODO_PRODUCT_STANDARD ?? "",
  pro: process.env.DODO_PRODUCT_PRO ?? "",
  credits_10: process.env.DODO_PRODUCT_CREDITS_10 ?? "",
  credits_25: process.env.DODO_PRODUCT_CREDITS_25 ?? "",
};

export type CheckoutKind = "standard" | "pro" | "credits_10" | "credits_25";
