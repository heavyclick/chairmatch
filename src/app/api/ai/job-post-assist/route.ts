import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { complete } from "@/lib/ai/provider";

/**
 * POST /api/ai/job-post-assist
 *
 * Conversational AI assistant for drafting a job posting. The client
 * sends the full conversation history + the current draft state on
 * every turn (stateless, same pattern as /api/ai/onboarding-assist),
 * and the AI either:
 *   a) Asks one clarifying question to gather more information, OR
 *   b) Returns a structured JSON draft when it has enough to produce
 *      a quality posting.
 *
 * Response shapes:
 *   { type: "question", text: "..." }          — AI needs more info
 *   { type: "draft", fields: { ... } }         — ready to preview
 *   { type: "revision", fields: { ... }, text: "..." } — updated draft
 *      after an owner change request ("make the description shorter")
 *
 * The `fields` object maps directly to the job_postings table columns,
 * so the client can POST it verbatim to /api/owner/job-postings on
 * confirmation.
 *
 * The SYSTEM prompt is structured so the AI:
 *  - Never invents specifics (pay, requirements) the owner didn't provide.
 *  - Keeps questions to one per turn to avoid overwhelming a practice
 *    owner who just wants to post a job, not fill out a questionnaire.
 *  - Writes the "not_a_fit_if" field in first-person present tense
 *    ("This role isn't a fit if you need...") matching our UI framing.
 *  - Returns valid JSON when outputting a draft — no markdown fences,
 *    no preamble, just the raw object the client can JSON.parse().
 */

const SYSTEM = `You are a hiring assistant embedded in Hdenta, a dental staffing platform. Your job is to help a dental practice owner draft a job posting through conversation.

WHAT YOU'RE BUILDING — a job_postings record with these fields:
  title (string)
  employment_type ("full_time" | "part_time" | "temp" | "contract")
  city (string)
  state (2-letter, e.g. "TX")
  pay_min (number, per-hour or per-year)
  pay_max (number)
  pay_unit ("hour" | "year")
  description (string — 2-4 sentences about the role and practice)
  requirements (string[] — bullet list, specific qualifications)
  benefits (string[] — pay, schedule perks, culture highlights)
  not_a_fit_if (string — one paragraph, first-person framing: "This role isn't a fit if you...")

CONVERSATION RULES:
1. Ask ONE question per turn. Never list multiple questions in the same message.
2. Start by asking: "What role are you hiring for, and is it full-time, part-time, or temp?"
3. After each answer, extract any fields you can (title, employment_type, etc.) and ask about the next most important unknown.
4. Typical question order: role + type → description/day-to-day → requirements → pay → benefits → not_a_fit_if.
5. You have enough to draft when you know: title, employment_type, description, and at least one requirement. Pay and benefits can be omitted from the draft if not provided.
6. When you have enough, output a JSON draft (see OUTPUT FORMAT below). Don't ask permission first — just produce it.
7. If the owner asks to change something ("make the description shorter", "add that we do Invisalign"), produce a revised draft.
8. Never invent specifics (dollar amounts, school requirements, software names) the owner didn't tell you. Leave those fields null.
9. Keep your questions under 30 words. Keep field values concise and professional — this is what candidates read.

NOT_A_FIT_IF FIELD:
This is a plain paragraph written as if the owner is speaking to the candidate: "This role isn't a fit if you need guaranteed 40 hours from day one, prefer a very structured environment with little autonomy, or are looking for a stepping-stone position." Be honest and specific. Don't write it as a bulleted list.

OUTPUT FORMAT — when outputting a draft, respond with ONLY valid JSON, no markdown fences, no preamble:
{
  "type": "draft",
  "fields": {
    "title": "...",
    "employment_type": "...",
    "city": "..." or null,
    "state": "..." or null,
    "pay_min": number or null,
    "pay_max": number or null,
    "pay_unit": "hour" or "year" or null,
    "description": "...",
    "requirements": ["...", "..."],
    "benefits": ["...", "..."],
    "not_a_fit_if": "..."
  }
}

When asking a question, respond with ONLY valid JSON:
{
  "type": "question",
  "text": "..."
}

When revising a draft, respond with ONLY valid JSON:
{
  "type": "revision",
  "text": "Here's the updated posting — does this look right?",
  "fields": { ... }
}`;

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const body = await request.json();
  const {
    messages,
    currentDraft,
  }: {
    messages: { role: "user" | "assistant"; content: string }[];
    currentDraft?: Record<string, unknown> | null;
  } = body;

  if (!Array.isArray(messages)) {
    return NextResponse.json({ error: "messages array required" }, { status: 400 });
  }

  // Inject the current draft state into the context so the AI can
  // reference what's already been confirmed when the owner asks for
  // revisions -- otherwise it might re-ask for information it already
  // has when the owner says "change the description."
  const contextMessages = [...messages];
  if (currentDraft && Object.keys(currentDraft).length > 0) {
    contextMessages.unshift({
      role: "assistant" as const,
      content: `[Current draft state: ${JSON.stringify(currentDraft)}]`,
    });
  }

  // Seed the conversation if it's the first turn.
  if (contextMessages.length === 0) {
    contextMessages.push({
      role: "user",
      content: "(starting job post creation)",
    });
  }

  try {
    const raw = await complete({
      system: SYSTEM,
      messages: contextMessages,
      maxTokens: 600,
      temperature: 0.5, // lower than onboarding-assist -- we want structured output
    });

    // The AI is instructed to output only JSON -- parse it and pass
    // through so the client gets a typed response rather than a raw
    // string. If parsing fails (AI went off-script), return the raw
    // text as a question so the conversation doesn't break entirely.
    let parsed: unknown;
    try {
      const cleaned = raw.trim().replace(/^```json\s*|```$/g, "");
      parsed = JSON.parse(cleaned);
    } catch {
      parsed = { type: "question", text: raw.trim() };
    }

    return NextResponse.json(parsed);
  } catch (err) {
    console.error("[/api/ai/job-post-assist]", err);
    return NextResponse.json(
      {
        type: "question",
        text: "I'm having trouble right now — you can continue filling in the form manually, or try again in a moment.",
      },
      { status: 200 } // 200 so the client treats it as a chat message, not a fatal error
    );
  }
}
