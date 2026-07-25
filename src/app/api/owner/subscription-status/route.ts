import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * GET /api/owner/subscription-status
 * Returns the practice's job posting subscription status + the
 * Gumroad checkout URL pre-filled with their supabase_user_id.
 * Used by /owner/jobs/new to gate the Publish button.
 */
export async function GET() {
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { data: practice } = await supabase
    .from("practice_profiles")
    .select("job_posting_subscription_active")
    .eq("id", authData.user.id)
    .maybeSingle();

  const hasJobPostingSubscription = practice?.job_posting_subscription_active ?? false;
  const checkoutUrl = `https://hdenta.gumroad.com/l/hdenta-job-postings?supabase_user_id=${authData.user.id}`;

  return NextResponse.json({ hasJobPostingSubscription, checkoutUrl });
}
