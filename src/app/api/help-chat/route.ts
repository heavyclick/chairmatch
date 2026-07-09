import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { complete } from "@/lib/ai/provider";
import { buildHelpChatSystemPrompt } from "@/lib/help-chat/system-prompt";

/**
 * POST /api/help-chat
 * body: { messages: { role: "user" | "assistant"; content: string }[] }
 *
 * Works for both logged-in and anonymous visitors (e.g. someone
 * reading the homepage with a question before signing up) -- account
 * type is looked up if there's a session, otherwise the system prompt
 * just doesn't assume one.
 */
export async function POST(request: NextRequest) {
  const { messages } = await request.json();
  if (!Array.isArray(messages) || messages.length === 0) {
    return NextResponse.json({ error: "No messages provided." }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getUser();

  let accountType: "owner" | "candidate" | null = null;
  if (authData.user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("account_type")
      .eq("id", authData.user.id)
      .single();
    accountType = (profile?.account_type as "owner" | "candidate" | undefined) ?? null;
  }

  try {
    const reply = await complete({
      system: buildHelpChatSystemPrompt(accountType),
      messages,
      maxTokens: 500,
      temperature: 0.4, // lower than the onboarding-writing-assist's temperature -- support answers should be consistent, not creative
    });
    return NextResponse.json({ reply });
  } catch (err) {
    console.error("[/api/help-chat] completion failed:", err);
    return NextResponse.json(
      { error: "Couldn't get a response right now. You can file a support ticket instead." },
      { status: 502 }
    );
  }
}
