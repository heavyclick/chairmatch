import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { sendEmail } from "@/lib/email/resend";
import { ownerWelcomeEmailHtml, candidateWelcomeEmailHtml } from "@/lib/email/templates/welcome";

/**
 * POST /api/auth/welcome
 *
 * Called at the END of onboarding now (see src/app/onboarding/owner
 * /page.tsx and .../candidate/page.tsx's final "Go to your dashboard"
 * button), not at signup -- previously this fired immediately after
 * account creation, before practice_profiles/candidate_profiles even
 * existed, so it could never be personalized and landed before anyone
 * had actually finished setting anything up. The separate, brief
 * confirmation email (src/app/api/auth/send-confirmation/route.ts)
 * covers the signup moment instead.
 *
 * Fire-and-forget by design: callers don't await this before
 * redirecting to the dashboard, and this route doesn't throw on email
 * failure -- a slow or failed welcome email should never block or
 * break someone finishing onboarding. sendEmail() itself already
 * fails soft (logs, doesn't throw) if RESEND_API_KEY isn't set.
 *
 * No body needed -- reads account_type and name straight from the
 * caller's own authenticated session/profile rather than trusting
 * anything the client might pass in.
 */
export async function POST() {
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("account_type, email")
    .eq("id", authData.user.id)
    .single();

  if (!profile) {
    return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  }

  try {
    if (profile.account_type === "owner") {
      const { data: practice } = await supabase
        .from("practice_profiles")
        .select("practice_name")
        .eq("id", authData.user.id)
        .single();

      await sendEmail({
        to: profile.email,
        subject: "You're all set up",
        html: ownerWelcomeEmailHtml(practice?.practice_name ?? null),
      });
    } else {
      const { data: candidate } = await supabase
        .from("candidate_profiles")
        .select("full_name")
        .eq("id", authData.user.id)
        .single();

      await sendEmail({
        to: profile.email,
        subject: "Welcome to Hdenta",
        html: candidateWelcomeEmailHtml(candidate?.full_name ?? null),
      });
    }
  } catch (err) {
    // Never let a welcome-email failure look like an onboarding failure.
    console.error("[/api/auth/welcome] send failed:", err);
  }

  return NextResponse.json({ ok: true });
}
