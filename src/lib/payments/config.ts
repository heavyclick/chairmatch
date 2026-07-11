/**
 * Which payment provider is actually live right now. Every payment
 * route (checkout, confirm, webhooks) reads this instead of hardcoding
 * a provider, so switching from Gumroad to Lemon Squeezy (once its
 * pending application is approved, or if Gumroad falls through) is a
 * one-line env var change on Vercel, not a code change:
 *
 *   PAYMENT_PROVIDER=gumroad        (default if unset)
 *   PAYMENT_PROVIDER=lemonsqueezy
 *
 * Both providers write to the same provider-agnostic DB columns
 * (payment_customer_id, payment_provider -- see
 * supabase/migrations/0018_gumroad_lemonsqueezy_migration.sql), so
 * switching doesn't strand existing subscribers' records either.
 */
export type ActivePaymentProvider = "gumroad" | "lemonsqueezy";

export const ACTIVE_PROVIDER: ActivePaymentProvider =
  process.env.PAYMENT_PROVIDER === "lemonsqueezy" ? "lemonsqueezy" : "gumroad";

/** Only "standard" is actually purchasable -- see apply-entitlement.ts. */
export type CheckoutKind = "standard";
