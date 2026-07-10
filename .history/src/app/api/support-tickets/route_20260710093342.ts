import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { sendEmail } from "@/lib/email/resend";
import { getSignedAttachmentUrls, type TicketAttachment } from "@/lib/support-tickets/attachments";

const MAX_ATTACHMENT_BYTES = 3 * 1024 * 1024; // 3MB per file, per founder's spec
const MAX_ATTACHMENTS = 5; // not specified, a sane cap to prevent one ticket from carrying an unbounded number of files

/** GET /api/support-tickets -- the current user's own ticket history. */
export async function GET() {
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { data: tickets, error } = await supabase
    .from("support_tickets")
    .select("id, subject, priority, status, created_at")
    .eq("user_id", authData.user.id)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ tickets: tickets ?? [] });
}

/**
 * POST /api/support-tickets
 * body: { subject: string; description: string; attachments?: { path, name, size }[] }
 *
 * Direct ticket filing -- separate from /api/help-chat/escalate (which
 * carries an AI conversation transcript). This is the plain "file a
 * ticket" button on the Support page: no AI conversation required
 * first. Attachments are uploaded to Supabase Storage client-side
 * before this call (see the Support page component) -- this route
 * only records the resulting paths and validates them, it doesn't
 * handle the upload itself.
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) {
    return NextResponse.json({ error: "Please sign in to file a support request." }, { status: 401 });
  }

  const { subject, description, attachments } = (await request.json()) as {
    subject: string;
    description: string;
    attachments?: TicketAttachment[];
  };

  if (!subject?.trim()) {
    return NextResponse.json({ error: "Subject is required." }, { status: 400 });
  }
  if (!description?.trim()) {
    return NextResponse.json({ error: "Please describe the issue." }, { status: 400 });
  }

  const validAttachments = (attachments ?? []).slice(0, MAX_ATTACHMENTS);
  const oversized = validAttachments.find((a) => a.size > MAX_ATTACHMENT_BYTES);
  if (oversized) {
    return NextResponse.json(
      { error: `"${oversized.name}" is over the 3MB limit.` },
      { status: 400 }
    );
  }
  // Every attachment path must actually belong to this user's own
  // storage folder -- the bucket's RLS already enforces this for the
  // upload itself, but re-checking here means a crafted request can't
  // attach someone else's file path to a ticket that isn't theirs.
  const foreignPath = validAttachments.find((a) => !a.path.startsWith(`${authData.user.id}/`));
  if (foreignPath) {
    return NextResponse.json({ error: "Invalid attachment." }, { status: 400 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("account_type, email")
    .eq("id", authData.user.id)
    .single();

  const { data: ticket, error } = await supabase
    .from("support_tickets")
    .insert({
      user_id: authData.user.id,
      account_type: profile?.account_type ?? null,
      subject: subject.trim(),
      conversation: [{ role: "user", content: description.trim() }],
      priority: "normal",
      attachments: validAttachments,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const supportEmail = process.env.SUPPORT_EMAIL;
  if (supportEmail) {
    const service = createServiceClient();
    const signedAttachments = await getSignedAttachmentUrls(service, validAttachments);
    const attachmentsHtml = signedAttachments.length
      ? `<p><strong>Attachments:</strong></p><ul>${signedAttachments
          .map((a) => `<li>${a.signedUrl ? `<a href="${a.signedUrl}">${a.name}</a>` : a.name}</li>`)
          .join("")}</ul>`
      : "";
    await sendEmail({
      to: supportEmail,
      subject: `[Hdenta ticket] ${subject.trim()}`,
      html: `<p>From: ${profile?.email ?? "unknown"} (${profile?.account_type ?? "unknown"})</p><hr/><p>${description
        .trim()
        .replace(/\n/g, "<br/>")}</p>${attachmentsHtml}`,
    });
  } else {
    console.warn("[/api/support-tickets] SUPPORT_EMAIL not set -- ticket created but no email sent.");
  }

  return NextResponse.json({ success: true, ticketId: ticket.id });
}
