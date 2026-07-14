import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { sendEmail } from "@/lib/email/resend";
import { confirmationEmailHtml } from "@/lib/email/templates/confirmation";

/**
 * POST /api/auth/send-confirmation
 *
 * Called once, right after signup (see src/app/(auth)/signup/page.tsx)
 * -- separate from /api/auth/welcome, which now fires later, at the
 * end of onboarding. Previously a single email tried to do both jobs
 * at once (welcome someone AND ask them to verify), sent immediately
 * after signup before practice_profiles/candidate_profiles even
 * existed, so it could never be personalized and conflated two
 * different moments into one message.
 *
 * Fire-and-forget by design, same as /api/auth/welcome -- never blocks
 * or breaks the signup -> onboarding flow.
 */
export async function POST() {
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("email, email_verification_token")
    .eq("id", authData.user.id)
    .single();

  if (!profile?.email_verification_token) {
    return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  }

  try {
    await sendEmail({
      to: profile.email,
      subject: "Confirm your email",
      html: confirmationEmailHtml(profile.email_verification_token),
    });
  } catch (err) {
    console.error("[/api/auth/send-confirmation] send failed:", err);
  }

  return NextResponse.json({ ok: true });
}
