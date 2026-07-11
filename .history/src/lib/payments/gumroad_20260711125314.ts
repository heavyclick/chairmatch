/**
 * Gumroad integration notes (read this before touching this file):
 *
 * Gumroad has no "create checkout session" API like Dodo/Stripe/Paddle
 * do. Products are pre-created once in the Gumroad dashboard (or via
 * their API), each with a fixed URL. "Creating a checkout" here just
 * means building a URL to that fixed product with query params --
 * Gumroad preserves any params it doesn't recognize (like our
 * `supabase_user_id`) into a `url_params` dictionary that shows up in
 * both the webhook ping and the API's sale record. See GUMROAD_SETUP.md
 * at the repo root for the one-time dashboard setup this depends on.
 *
 * Gumroad also does not support webhook signature verification (see
 * src/app/api/webhooks/gumroad/route.ts) -- every function here that
 * takes an id fetched from an incoming ping treats that ping as
 * nothing more than a hint to go check the *authoritative* record via
 * this API, using our own access token. Never trust ping body data
 * directly for anything that grants access.
 */

const GUMROAD_API_BASE = "https://api.gumroad.com/v2";

function getAccessToken(): string {
  if (!process.env.GUMROAD_ACCESS_TOKEN) {
    throw new Error(
      "GUMROAD_ACCESS_TOKEN is not set. Add it to .env.local before using billing features -- see GUMROAD_SETUP.md."
    );
  }
  return process.env.GUMROAD_ACCESS_TOKEN;
}

/**
 * The seller subdomain (e.g. "hdenta" for hdenta.gumroad.com) and the
 * Standard plan's product permalink (the part after /l/ in its URL).
 * Both come from the one-time product setup in GUMROAD_SETUP.md.
 */
export const GUMROAD_CONFIG = {
  sellerSubdomain: process.env.GUMROAD_SELLER_SUBDOMAIN ?? "",
  standardProductPermalink: process.env.GUMROAD_STANDARD_PERMALINK ?? "",
};

/**
 * Builds the checkout URL for the Standard plan.
 *
 * - `wanted=true` sends the buyer straight to the checkout form,
 *   skipping the public product description page (see "Send customers
 *   directly to checkout" in Gumroad's URL parameters docs).
 * - `email` prefills the checkout form with the account's email
 *   (Gumroad's "Autofill your checkout form" behavior) so the buyer
 *   doesn't have to retype it, and gives us a second (non-authoritative)
 *   signal to cross-check against later.
 * - `supabase_user_id` is not a Gumroad-recognized param -- it rides
 *   along as a custom url_param and is how we match a completed sale
 *   back to a specific practice account, the same role Dodo's
 *   `metadata.supabase_user_id` played.
 */
export function buildGumroadCheckoutUrl(params: { userId: string; email: string }): string {
  if (!GUMROAD_CONFIG.sellerSubdomain || !GUMROAD_CONFIG.standardProductPermalink) {
    throw new Error(
      "GUMROAD_SELLER_SUBDOMAIN or GUMROAD_STANDARD_PERMALINK is not set -- see GUMROAD_SETUP.md."
    );
  }

  const url = new URL(
    `https://${GUMROAD_CONFIG.sellerSubdomain}.gumroad.com/l/${GUMROAD_CONFIG.standardProductPermalink}`
  );
  url.searchParams.set("wanted", "true");
  url.searchParams.set("email", params.email);
  url.searchParams.set("supabase_user_id", params.userId);
  return url.toString();
}

export interface GumroadSale {
  success: boolean;
  sale?: {
    id: string;
    email: string;
    product_id: string;
    product_permalink: string;
    subscription_id?: string | null;
    recurrence?: string | null;
    refunded: boolean;
    disputed: boolean;
    chargedback: boolean;
    url_params?: Record<string, string>;
    test: boolean;
  };
  message?: string;
}

/**
 * Fetches the authoritative record of a sale directly from Gumroad,
 * using OUR access token -- not data from an incoming ping. This is
 * what both /api/checkout/confirm and the webhook route actually rely
 * on for the yes/no answer to "did this sale really happen."
 */
export async function fetchGumroadSale(saleId: string): Promise<GumroadSale> {
  const res = await fetch(`${GUMROAD_API_BASE}/sales/${encodeURIComponent(saleId)}?access_token=${getAccessToken()}`);
  const data = (await res.json()) as GumroadSale;
  if (!res.ok || !data.success) {
    throw new Error(data.message ?? `Gumroad sale lookup failed (HTTP ${res.status})`);
  }
  return data;
}

export interface GumroadSubscriber {
  success: boolean;
  subscriber?: {
    id: string;
    product_id: string;
    user_email: string;
    status: "alive" | "pending_cancellation" | "pending_failure" | "failed_payment" | "fixed_subscription_period_ended" | "cancelled";
    cancelled_at?: string | null;
    ended_at?: string | null;
  };
  message?: string;
}

/** Used by the webhook route to check a subscription's real status on subscription_ended/cancellation pings. */
export async function fetchGumroadSubscriber(subscriberId: string): Promise<GumroadSubscriber> {
  const res = await fetch(
    `${GUMROAD_API_BASE}/subscribers/${encodeURIComponent(subscriberId)}?access_token=${getAccessToken()}`
  );
  const data = (await res.json()) as GumroadSubscriber;
  if (!res.ok || !data.success) {
    throw new Error(data.message ?? `Gumroad subscriber lookup failed (HTTP ${res.status})`);
  }
  return data;
}
