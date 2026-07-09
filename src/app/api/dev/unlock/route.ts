import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { applyDodoEntitlement } from "@/lib/dodo/apply-entitlement";
import type { CheckoutKind } from "@/lib/dodo/server";

/**
 * POST /api/dev/unlock
 *
 * DEV-ONLY fallback for testing the post-payment unlock flow on localhost.
 *
 * Why this exists: Dodo Payments calls your webhook URL directly from
 * their servers to confirm a payment. They cannot reach
 * `http://localhost:3000` -- there is no way around this without tunneling
 * (ngrok/cloudflared) and a registered HTTPS webhook URL, which is real
 * setup overhead you don't need just to click through the unlock UX while
 * building. Real checkout still happens through Dodo here (card entry,
 * actual charge in test mode) -- this route only stands in for the
 * webhook call that would normally follow it, so you can verify your
 * frontend/DB unlock behavior end-to-end without standing up a tunnel.
 *
 * Hard-blocked outside development:
 *   - 404s immediately unless NODE_ENV !== "production" (Next.js inlines
 *     NODE_ENV at build time, so this branch doesn't exist in a
 *     production build/bundle at all).
 *   - Still requires a real logged-in session and only ever acts on
 *     request.user.id -- there is no way to unlock an arbitrary
 *     account through this route.
 *
 * Once you deploy with a real HTTPS URL and set DODO_WEBHOOK_SECRET,
 * register that URL in the Dodo dashboard and the real webhook
 * (src/app/api/webhooks/dodo/route.ts) takes over -- this route becomes
 * inert (404) the moment NODE_ENV is "production", so there's nothing to
 * remove before shipping.
 */
export async function POST(request: NextRequest) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { kind } = (await request.json()) as { kind: CheckoutKind };
  // PAUSED (AI Pro tier): "pro"/"credits_10"/"credits_25" removed from
  // this allowlist -- applyDodoEntitlement() now silently no-ops for
  // them, which would otherwise make this route return a confusing
  // {ok: true} for a grant that didn't actually happen. Restore
  // ["standard", "pro", "credits_10", "credits_25"] when Pro ships.
  if (!["standard"].includes(kind)) {
    return NextResponse.json({ error: `"${kind}" isn't available right now.` }, { status: 400 });
  }

  // Use the service-role client for the write, same as the real webhook
  // does. As of supabase/migrations/0004_lock_billing_columns.sql, owners
  // can no longer write subscription_tier/credit columns on their own row
  // directly (that gap is what made this route necessary to lock down
  // server-side in the first place) -- only service-role code can.
  const service = createServiceClient();
  await applyDodoEntitlement(service, authData.user.id, kind, {
    dodoPaymentId: `dev_manual_${Date.now()}`,
  });

  return NextResponse.json({ ok: true });
}
