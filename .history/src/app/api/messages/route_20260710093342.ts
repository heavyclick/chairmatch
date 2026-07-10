import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { notifyUser } from "@/lib/notifications/create";

/**
 * GET /api/messages -- list threads for the current user (owner or candidate)
 * GET /api/messages?thread_id=X -- list messages in one thread
 * POST /api/messages -- start/continue a thread
 */
/**
 * GET /api/messages -- list threads for the current user (owner or candidate)
 * GET /api/messages?thread_id=X -- messages in one thread + the other
 *   party's header info (name/role/photo), and marks the thread read
 *   for the current viewer as a side effect of fetching it
 * POST /api/messages -- start/continue a thread
 */
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const threadId = searchParams.get("thread_id");

  if (threadId) {
    const { data: thread } = await supabase
      .from("message_threads")
      .select(
        `owner_id, candidate_id,
         owner:practice_profiles(practice_name, photo_url),
         candidate:candidate_profiles(full_name, photo_url, primary_role_id, role:roles(label))`
      )
      .eq("id", threadId)
      .maybeSingle();

    if (!thread) return NextResponse.json({ error: "Thread not found" }, { status: 404 });

    const isOwner = thread.owner_id === authData.user.id;
    const otherPartyRaw = isOwner ? thread.candidate : thread.owner;
    const otherParty = isOwner
      ? (() => {
          const c = otherPartyRaw as unknown as { full_name: string; photo_url: string | null; role: { label: string } | null } | null;
          return c ? { name: c.full_name, photoUrl: c.photo_url, subtitle: c.role?.label ?? null } : null;
        })()
      : (() => {
          const o = otherPartyRaw as unknown as { practice_name: string; photo_url: string | null } | null;
          return o ? { name: o.practice_name, photoUrl: o.photo_url, subtitle: null } : null;
        })();

    const { data: messages, error } = await supabase
      .from("messages")
      .select("*")
      .eq("thread_id", threadId)
      .order("sent_at", { ascending: true });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // Mark read for whichever side is currently viewing -- side effect
    // of fetching the thread, matching normal messaging-app semantics
    // (opening a conversation is what marks it read, no separate action
    // needed). Uses the user-scoped client so RLS still applies (see
    // migration 0016 -- a participant can only update their own side).
    await supabase
      .from("message_threads")
      .update(isOwner ? { owner_last_read_at: new Date().toISOString() } : { candidate_last_read_at: new Date().toISOString() })
      .eq("id", threadId);

    return NextResponse.json({ messages, otherParty });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("account_type")
    .eq("id", authData.user.id)
    .single();

  const isOwnerViewer = profile?.account_type === "owner";
  const column = isOwnerViewer ? "owner_id" : "candidate_id";

  const { data: threads, error } = await supabase
    .from("message_threads")
    .select(
      isOwnerViewer
        ? "*, candidate:candidate_profiles(full_name, photo_url, primary_role_id, role:roles(label))"
        : "*, owner:practice_profiles(practice_name, photo_url)"
    )
    .eq(column, authData.user.id)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Attach unread status + last-message preview per thread. One extra
  // query for the most recent message across all of this user's
  // threads, rather than N queries (one per thread) -- fetched once,
  // then grouped in memory below.
  const threadIds = (threads ?? []).map((t) => t.id);
  const lastMessageByThread = new Map<string, { body: string; sender_id: string; sent_at: string }>();
  if (threadIds.length > 0) {
    const { data: recentMessages } = await supabase
      .from("messages")
      .select("thread_id, body, sender_id, sent_at")
      .in("thread_id", threadIds)
      .order("sent_at", { ascending: false });
    for (const m of recentMessages ?? []) {
      if (!lastMessageByThread.has(m.thread_id)) {
        lastMessageByThread.set(m.thread_id, m);
      }
    }
  }

  const enrichedThreads = (threads ?? []).map((t) => {
    const lastMessage = lastMessageByThread.get(t.id);
    const lastReadAt = isOwnerViewer ? t.owner_last_read_at : t.candidate_last_read_at;
    const isUnread =
      !!lastMessage &&
      lastMessage.sender_id !== authData.user.id &&
      (!lastReadAt || new Date(lastMessage.sent_at) > new Date(lastReadAt));
    return {
      ...t,
      last_message_preview: lastMessage?.body?.slice(0, 80) ?? null,
      last_message_at: lastMessage?.sent_at ?? t.created_at,
      is_unread: isUnread,
    };
  });
  enrichedThreads.sort((a, b) => new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime());

  return NextResponse.json({ threads: enrichedThreads });
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const body = await request.json();
  const { candidateId, body: messageBody, threadId: existingThreadId } = body;

  let threadId = existingThreadId;

  if (!threadId) {
    // The current user is the owner side of a new thread -- candidates
    // reply into existing threads (threadId provided), they don't
    // originate new ones from this endpoint.
    const ownerId = authData.user.id;

    // "Direct message any candidate" is an explicitly advertised
    // Standard/Pro feature (see the billing page's plan list) -- this
    // was never actually enforced anywhere, meaning a free-tier owner
    // could message any candidate with zero restriction. Only gates
    // starting a NEW thread; an already-existing conversation is
    // unaffected by tier changes, so a later downgrade doesn't cut off
    // a conversation already in progress.
    const { data: practice } = await supabase
      .from("practice_profiles")
      .select("subscription_tier")
      .eq("id", ownerId)
      .single();
    const tier = practice?.subscription_tier ?? "free";
    if (tier !== "standard" && tier !== "pro") {
      return NextResponse.json(
        { error: "Messaging candidates requires a Standard or Pro plan.", requiresUpgrade: true },
        { status: 402 }
      );
    }

    const { data: existing } = await supabase
      .from("message_threads")
      .select("id")
      .eq("owner_id", ownerId)
      .eq("candidate_id", candidateId)
      .maybeSingle();

    if (existing) {
      threadId = existing.id;
    } else {
      const { data: created, error: createError } = await supabase
        .from("message_threads")
        .insert({ owner_id: ownerId, candidate_id: candidateId })
        .select("id")
        .single();
      if (createError) return NextResponse.json({ error: createError.message }, { status: 500 });
      threadId = created.id;
    }
  }

  const { data: message, error } = await supabase
    .from("messages")
    .insert({ thread_id: threadId, sender_id: authData.user.id, body: messageBody })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Notify the OTHER party in the thread -- whichever of owner_id/
  // candidate_id doesn't match the sender. Fetched fresh rather than
  // assumed from candidateId (which is only present on the very first
  // message of a new thread; replies only carry threadId).
  const { data: thread } = await supabase
    .from("message_threads")
    .select("owner_id, candidate_id")
    .eq("id", threadId)
    .single();

  if (thread) {
    const recipientId = thread.owner_id === authData.user.id ? thread.candidate_id : thread.owner_id;
    const { data: senderProfile } = await supabase
      .from(thread.owner_id === authData.user.id ? "practice_profiles" : "candidate_profiles")
      .select(thread.owner_id === authData.user.id ? "practice_name" : "full_name")
      .eq("id", authData.user.id)
      .single();
    const senderName =
      (senderProfile as { practice_name?: string; full_name?: string } | null)?.practice_name ??
      (senderProfile as { practice_name?: string; full_name?: string } | null)?.full_name ??
      "Someone";

    await notifyUser(createServiceClient(), {
      userId: recipientId,
      type: "new_message",
      title: `New message from ${senderName}`,
      body: messageBody.slice(0, 140),
      link: thread.owner_id === authData.user.id ? `/candidate/messages/${threadId}` : `/owner/messages/${threadId}`,
      email: {
        subject: `New message from ${senderName} on Hdenta`,
        html: `<p><strong>${senderName}</strong> sent you a message on Hdenta:</p><p style="color:#555">${messageBody}</p><p><a href="${process.env.NEXT_PUBLIC_SITE_URL ?? ""}${thread.owner_id === authData.user.id ? `/candidate/messages/${threadId}` : `/owner/messages/${threadId}`}">Reply on Hdenta</a></p>`,
      },
    });
  }

  return NextResponse.json({ message, threadId });
}
