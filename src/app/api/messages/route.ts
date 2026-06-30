import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * GET /api/messages -- list threads for the current user (owner or candidate)
 * GET /api/messages?thread_id=X -- list messages in one thread
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
    const { data: messages, error } = await supabase
      .from("messages")
      .select("*")
      .eq("thread_id", threadId)
      .order("sent_at", { ascending: true });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ messages });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("account_type")
    .eq("id", authData.user.id)
    .single();

  const column = profile?.account_type === "owner" ? "owner_id" : "candidate_id";

  const { data: threads, error } = await supabase
    .from("message_threads")
    .select(
      profile?.account_type === "owner"
        ? "*, candidate:candidate_profiles(full_name, primary_role_id, role:roles(label))"
        : "*, owner:practice_profiles(practice_name)"
    )
    .eq(column, authData.user.id)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ threads });
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
  return NextResponse.json({ message, threadId });
}
