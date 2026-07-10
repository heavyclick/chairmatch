import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { sendEmail } from "@/lib/email/resend";

/**
 * POST /api/help-chat/escalate
 * body: { subject: string; conversation: {role, content}[]; requestHuman?: boolean }
 *
 * Creates a support_tickets row and emails SUPPORT_EMAIL with the full
 * transcript, since there's no admin dashboard yet (see README) --
 * this is what makes an escalation actually actionable in the
 * meantime.
 *
 * `requestHuman` (the Pro-tier "talk to a person" option) is only ever
 * honored if the requester is actually a Pro-tier owner, verified
 * server-side against practice_profiles.subscription_tier -- never
 * trusted from the client, since a client-sent boolean is trivially
 * fakeable.
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) {
    return NextResponse.json({ error: "Please sign in to file a support request." }, { status: 401 });
  }

  const { subject, conversation, requestHuman } = await request.json();
  if (!subject?.trim()) {
    return NextResponse.json({ error: "Subject is required." }, { status: 400 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("account_type, email")
    .eq("id", authData.user.id)
    .single();

  let verifiedHumanRequest = false;
  if (requestHuman && profile?.account_type === "owner") {
    const { data: practice } = await supabase
      .from("practice_profiles")
      .select("subscription_tier")
      .eq("id", authData.user.id)
      .single();
    verifiedHumanRequest = practice?.subscription_tier === "pro";
  }

  const { data: ticket, error } = await supabase
    .from("support_tickets")
    .insert({
      user_id: authData.user.id,
      account_type: profile?.account_type ?? null,
      subject: subject.trim(),
      conversation: conversation ?? [],
      priority: verifiedHumanRequest ? "human_requested" : "normal",
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const supportEmail = process.env.SUPPORT_EMAIL;
  if (supportEmail) {
    const transcriptHtml = (conversation ?? [])
      .map((m: { role: string; content: string }) => `<p><strong>${m.role}:</strong> ${m.content}</p>`)
      .join("");
    await sendEmail({
      to: supportEmail,
      subject: `[Hdenta ${verifiedHumanRequest ? "URGENT -- human requested" : "support"}] ${subject.trim()}`,
      html: `<p>From: ${profile?.email ?? "unknown"} (${profile?.account_type ?? "unknown"})</p>${
        verifiedHumanRequest ? "<p><strong>Pro-tier owner requested direct human contact.</strong></p>" : ""
      }<hr/>${transcriptHtml}`,
    });
  } else {
    console.warn("[/api/help-chat/escalate] SUPPORT_EMAIL not set -- ticket created but no email sent.");
  }

  return NextResponse.json({ success: true, ticketId: ticket.id, humanRequestHonored: verifiedHumanRequest });
}
