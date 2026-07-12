import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { sendEmail } from "@/lib/email/resend";
import { ownerWelcomeEmailHtml, candidateWelcomeEmailHtml } from "@/lib/email/templates/welcome";

/**
 * POST /api/auth/welcome
 *
 * Called once, right after signup (see src/app/(auth)/signup/page.tsx),
 * immediately after the profiles row is successfully created. Sends a
 * welcome email from the Hdenta domain via Resend (src/lib/email/
 * resend.ts) -- previously nothing sent this at all.
 *
 * Fire-and-forget by design: the signup page doesn't await this before
 * redirecting into onboarding, and this route doesn't throw on email
 * failure -- a slow or failed welcome email should never block or
 * break someone finishing account setup. sendEmail() itself already
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
        subject: "Welcome to Hdenta",
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
    // Never let a welcome-email failure look like a signup failure.
    console.error("[/api/auth/welcome] send failed:", err);
  }

  return NextResponse.json({ ok: true });
}
