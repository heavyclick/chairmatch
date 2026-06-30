import Stripe from "stripe";

/**
 * Server-only Stripe client. Never import this into a Client Component.
 *
 * Constructed lazily (not at module load time) because the Stripe SDK
 * throws immediately if the API key is missing/empty -- that would
 * break the production build and any page that imports this module
 * even indirectly, before a real key is ever configured. Each call
 * site should call getStripe() rather than importing a top-level
 * instance.
 *
 * Pricing reference (see build doc Section 8):
 * - Standard: $100/yr flat
 * - Pro: $250/yr flat, includes a starter bank of screening credits
 * - Screening credits: $5 each, sold in packs of 10 ($45) or 25 ($100)
 *
 * Price IDs below are read from env vars rather than hardcoded so they
 * can point at Stripe test-mode prices during development and live
 * prices in production without a code change.
 */
let _stripe: Stripe | null = null;

export function getStripe(): Stripe {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error(
      "STRIPE_SECRET_KEY is not set. Add it to .env.local before using billing features."
    );
  }
  if (!_stripe) {
    _stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: "2026-06-24.dahlia",
    });
  }
  return _stripe;
}

export const STRIPE_PRICE_IDS = {
  standard: process.env.STRIPE_PRICE_STANDARD ?? "",
  pro: process.env.STRIPE_PRICE_PRO ?? "",
  credits_10: process.env.STRIPE_PRICE_CREDITS_10 ?? "",
  credits_25: process.env.STRIPE_PRICE_CREDITS_25 ?? "",
};

