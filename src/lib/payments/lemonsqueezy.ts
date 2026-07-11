import crypto from "crypto";

/**
 * Lemon Squeezy integration notes:
 *
 * Unlike Gumroad, Lemon Squeezy has a real "create checkout" API
 * (POST /v1/checkouts) that returns a fresh hosted checkout URL per
 * request, much closer to how the old Dodo integration worked --
 * custom metadata rides through checkout_data.custom and comes back
 * as meta.custom_data on every webhook. It DOES support webhook
 * signature verification (HMAC-SHA256 over the raw body, X-Signature
 * header), unlike Gumroad.
 *
 * This file is only exercised when PAYMENT_PROVIDER=lemonsqueezy (see
 * src/lib/payments/config.ts) -- kept fully wired up and ready so
 * switching away from Gumroad, if needed, is an env var flip rather
 * than a rewrite. See GUMROAD_SETUP.md for the matching Lemon Squeezy
 * setup steps.
 */

const LEMONSQUEEZY_API_BASE = "https://api.lemonsqueezy.com/v1";

function getApiKey(): string {
  if (!process.env.LEMONSQUEEZY_API_KEY) {
    throw new Error("LEMONSQUEEZY_API_KEY is not set. Add it to .env.local before using billing features.");
  }
  return process.env.LEMONSQUEEZY_API_KEY;
}

export const LEMONSQUEEZY_CONFIG = {
  storeId: process.env.LEMONSQUEEZY_STORE_ID ?? "",
  standardVariantId: process.env.LEMONSQUEEZY_STANDARD_VARIANT_ID ?? "",
};

/**
 * Creates a hosted checkout and returns its URL. `custom.supabase_user_id`
 * comes back in `meta.custom_data` on every webhook this checkout produces
 * (order_created, subscription_created, etc.) -- that's how the webhook
 * route matches a sale back to a practice account.
 */
export async function createLemonSqueezyCheckout(params: {
  userId: string;
  email: string;
  returnUrl: string;
}): Promise<string> {
  if (!LEMONSQUEEZY_CONFIG.storeId || !LEMONSQUEEZY_CONFIG.standardVariantId) {
    throw new Error("LEMONSQUEEZY_STORE_ID or LEMONSQUEEZY_STANDARD_VARIANT_ID is not set.");
  }

  const res = await fetch(`${LEMONSQUEEZY_API_BASE}/checkouts`, {
    method: "POST",
    headers: {
      Accept: "application/vnd.api+json",
      "Content-Type": "application/vnd.api+json",
      Authorization: `Bearer ${getApiKey()}`,
    },
    body: JSON.stringify({
      data: {
        type: "checkouts",
        attributes: {
          checkout_data: {
            email: params.email,
            custom: { supabase_user_id: params.userId },
          },
          product_options: {
            redirect_url: params.returnUrl,
          },
        },
        relationships: {
          store: { data: { type: "stores", id: LEMONSQUEEZY_CONFIG.storeId } },
          variant: { data: { type: "variants", id: LEMONSQUEEZY_CONFIG.standardVariantId } },
        },
      },
    }),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data?.errors?.[0]?.detail ?? `Lemon Squeezy checkout creation failed (HTTP ${res.status})`);
  }
  return data.data.attributes.url as string;
}

/**
 * Verifies the X-Signature header on an incoming webhook using the
 * signing secret set when the webhook was created in the Lemon Squeezy
 * dashboard (LEMONSQUEEZY_WEBHOOK_SECRET). Unlike Gumroad, this is a
 * real cryptographic guarantee the request came from Lemon Squeezy --
 * do this check before parsing/trusting anything in the body.
 */
export function verifyLemonSqueezySignature(rawBody: string, signatureHeader: string | null): boolean {
  if (!process.env.LEMONSQUEEZY_WEBHOOK_SECRET || !signatureHeader) return false;
  const expected = crypto
    .createHmac("sha256", process.env.LEMONSQUEEZY_WEBHOOK_SECRET)
    .update(rawBody)
    .digest("hex");
  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signatureHeader));
  } catch {
    // Buffers of different length throw rather than returning false.
    return false;
  }
}

export interface LemonSqueezyWebhookPayload {
  meta: {
    event_name: string;
    custom_data?: { supabase_user_id?: string };
  };
  data: {
    id: string;
    type: string;
    attributes: {
      status?: string;
      customer_id?: number;
      user_email?: string;
      ends_at?: string | null;
    };
  };
}
