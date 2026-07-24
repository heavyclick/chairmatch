import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { fetchGumroadSale } from "@/lib/payments/gumroad";

/**
 * POST /api/webhooks/gumroad/job-posting-sale
 *
 * Mirrors /api/webhooks/gumroad/sale exactly, but for the separate
 * $50/month Job Postings product on Gumroad. Register this URL as a
 * second resource_subscription in Gumroad for the job-postings product
 * (same setup as GUMROAD_SETUP.md but pointing to this URL).
 *
 * On a confirmed, non-refunded sale:
 *   - Sets job_posting_subscription_active = true on the practice profile
 *   - Stores the Gumroad subscription_id (or sale id) as
 *     job_posting_customer_id for use by the subscription-ended handler
 *
 * CRITICAL: same as the main sale handler — Gumroad pings are unsigned.
 * The sale API lookup (fetchGumroadSale) is what actually confirms this
 * is a real, unrefunded payment before granting anything.
 *
 * Payload is x-www-form-urlencoded. supabase_user_id must be appended
 * to the Gumroad product URL as a query param at checkout time:
 *   https://[seller].gumroad.com/l/[permalink]?supabase_user_id=[uuid]
 */
export async function POST(request: NextRequest) {
  const body = await request.formData();
  const saleId  = body.get("sale_id")?.toString();
  const userId  = body.get("url_params[supabase_user_id]")?.toString();

  if (!saleId || !userId) {
    console.warn(
      `[/api/webhooks/gumroad/job-posting-sale] ping missing sale_id or supabase_user_id (sale_id: ${saleId ?? "none"})`
    );
    return NextResponse.json({ received: true });
  }

  try {
    const { sale } = await fetchGumroadSale(saleId);

    if (!sale || sale.refunded || sale.disputed || sale.chargedback) {
      console.log("[/api/webhooks/gumroad/job-posting-sale] ignoring refunded/disputed/chargedback sale:", saleId);
      return NextResponse.json({ received: true });
    }

    if (sale.test) {
      console.log("[/api/webhooks/gumroad/job-posting-sale] ignoring Gumroad test-purchase ping:", saleId);
      return NextResponse.json({ received: true });
    }

    const supabase = createServiceClient();

    // Grant the job posting subscription.
    const { error } = await supabase
      .from("practice_profiles")
      .update({
        job_posting_subscription_active: true,
        job_posting_subscription_started_at: new Date().toISOString(),
        // Store for the subscription-ended handler, which receives
        // subscriber_id (= the Gumroad subscription_id for recurring
        // products) and needs to match it back to a practice row.
        job_posting_customer_id: sale.subscription_id ?? sale.id,
      })
      .eq("id", userId);

    if (error) {
      console.error("[/api/webhooks/gumroad/job-posting-sale] DB update failed:", error);
    } else {
      console.log("[/api/webhooks/gumroad/job-posting-sale] granted job posting subscription:", userId);
    }
  } catch (err) {
    console.error("[/api/webhooks/gumroad/job-posting-sale] failed:", err);
    // Return 200 regardless -- see sale/route.ts for reasoning on
    // not returning 4xx/5xx to Gumroad on lookup failures.
  }

  return NextResponse.json({ received: true });
}
