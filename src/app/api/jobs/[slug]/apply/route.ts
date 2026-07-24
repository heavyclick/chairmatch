import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { notifyUser } from "@/lib/notifications/create";

/**
 * POST /api/jobs/[slug]/apply
 *
 * Submits a candidate's application to a native Hdenta job posting.
 * Only valid for source_type = 'internal' postings (i.e. rows in
 * job_postings, not the scraped jobs table). External jobs redirect
 * off-site via the ApplyInterstitial component; they never hit this
 * route.
 *
 * On success:
 *  1. Writes a job_applications row.
 *  2. Opens (or reuses) a message_thread between the candidate and owner.
 *  3. Seeds the thread with an application summary message from the
 *     candidate, so the owner's Messages inbox immediately shows context.
 *  4. Sends an in-app + email notification to the owner.
 *
 * Returns { application_id, thread_id } so the client can redirect the
 * candidate to their message thread with the practice.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const supabase = await createClient();
  const serviceSupabase = createServiceClient();
  const { data: authData } = await supabase.auth.getUser();

  if (!authData.user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  // Fetch the native posting -- must be active.
  const { data: posting } = await supabase
    .from("job_postings")
    .select("id, owner_id, title, status")
    .eq("slug", slug)
    .eq("status", "active")
    .maybeSingle();

  if (!posting) {
    return NextResponse.json({ error: "Job posting not found or no longer active" }, { status: 404 });
  }

  // Candidates can't apply to their own practice's posting (edge case
  // for practices that have a dual owner/candidate account -- rare but
  // possible in the current schema where practice owner and candidate
  // live in separate tables keyed by the same auth.uid).
  if (posting.owner_id === authData.user.id) {
    return NextResponse.json({ error: "Cannot apply to your own posting" }, { status: 400 });
  }

  // Check candidate has a complete-enough profile to apply.
  const { data: candidate } = await supabase
    .from("candidate_profiles")
    .select("id, full_name, value_add_text, primary_role_id")
    .eq("id", authData.user.id)
    .maybeSingle();

  if (!candidate?.full_name) {
    return NextResponse.json(
      { error: "Complete your profile before applying", code: "incomplete_profile" },
      { status: 403 }
    );
  }

  // Duplicate-application guard -- the unique constraint also catches
  // this, but an explicit check surfaces a clean human-readable error.
  const { data: existing } = await supabase
    .from("job_applications")
    .select("id")
    .eq("job_posting_id", posting.id)
    .eq("applicant_id", authData.user.id)
    .maybeSingle();

  if (existing) {
    return NextResponse.json(
      { error: "You've already applied to this job", code: "already_applied" },
      { status: 409 }
    );
  }

  const body = await request.json().catch(() => ({}));
  const cover_note: string | null = body.cover_note?.trim() || null;

  // ── Open or reuse a message thread ────────────────────────────────────────
  // Reuse an existing thread between this owner and candidate if one
  // already exists (e.g. they messaged before), so conversation history
  // is preserved in one thread rather than forked.
  let threadId: string;
  const { data: existingThread } = await supabase
    .from("message_threads")
    .select("id")
    .eq("owner_id", posting.owner_id)
    .eq("candidate_id", authData.user.id)
    .maybeSingle();

  if (existingThread) {
    threadId = existingThread.id;
  } else {
    const { data: newThread, error: threadError } = await serviceSupabase
      .from("message_threads")
      .insert({ owner_id: posting.owner_id, candidate_id: authData.user.id })
      .select("id")
      .single();

    if (threadError || !newThread) {
      console.error("[/api/jobs/[slug]/apply] thread create error:", threadError);
      return NextResponse.json({ error: "Failed to open message thread" }, { status: 500 });
    }
    threadId = newThread.id;
  }

  // ── Write the application ─────────────────────────────────────────────────
  const { data: application, error: appError } = await supabase
    .from("job_applications")
    .insert({
      job_posting_id: posting.id,
      applicant_id: authData.user.id,
      cover_note,
      status: "pending",
      message_thread_id: threadId,
    })
    .select("id")
    .single();

  if (appError) {
    // Unique violation -- race condition where the client submitted twice.
    if (appError.code === "23505") {
      return NextResponse.json(
        { error: "You've already applied to this job", code: "already_applied" },
        { status: 409 }
      );
    }
    console.error("[/api/jobs/[slug]/apply] insert error:", appError);
    return NextResponse.json({ error: appError.message }, { status: 500 });
  }

  // ── Seed the thread with an application summary message ───────────────────
  // Written as if from the candidate so it appears in the owner's inbox
  // with natural context -- they don't have to click into applicants
  // separately; the message thread tells them exactly what applied and
  // for which posting.
  const summaryLines = [
    `Hi — I'm applying for your **${posting.title}** position on Hdenta.`,
    ...(cover_note ? [`\n${cover_note}`] : []),
    ...(candidate.value_add_text
      ? [`\n**About me:** ${candidate.value_add_text}`]
      : []),
  ];

  await serviceSupabase.from("messages").insert({
    thread_id: threadId,
    sender_id: authData.user.id,
    body: summaryLines.join("\n"),
    sent_at: new Date().toISOString(),
  });

  // ── Notify the owner ──────────────────────────────────────────────────────
  await notifyUser(serviceSupabase, {
    userId: posting.owner_id,
    type: "new_message",  // reuses the existing notification type + email pref
    title: `New application: ${posting.title}`,
    body: `${candidate.full_name} applied to your job posting.`,
    link: `/owner/jobs/${posting.id}?tab=applicants`,
    email: {
      subject: `New Hdenta application — ${posting.title}`,
      html: `<p><strong>${candidate.full_name}</strong> just applied to your <strong>${posting.title}</strong> posting on Hdenta.</p>
${cover_note ? `<p><em>"${cover_note}"</em></p>` : ""}
<p><a href="${process.env.NEXT_PUBLIC_SITE_URL ?? ""}/owner/jobs/${posting.id}?tab=applicants">View their application →</a></p>`,
    },
  });

  return NextResponse.json({ application_id: application.id, thread_id: threadId }, { status: 201 });
}
