import { NextRequest, NextResponse } from "next/server";
import { complete } from "@/lib/ai/provider";

/**
 * POST /api/ai/onboarding-assist
 *
 * Helps a candidate or owner write the open-ended qualitative fields
 * during onboarding (value_add_text, future_goals_text,
 * recovery_scenario_text for candidates; culture_text, thrive_text,
 * honest_challenges_text for owners).
 *
 * This is intentionally a back-and-forth helper, not an auto-write
 * button: the AI asks a clarifying follow-up question OR proposes
 * draft wording the person can edit -- it never silently fills the
 * field. The qualitative section is the product's actual differentiator,
 * so the person's authentic answer matters more than getting a
 * field filled quickly.
 */

type FieldKey =
  | "value_add"
  | "future_goals"
  | "recovery_scenario"
  | "culture"
  | "thrive"
  | "honest_challenges";

const FIELD_PROMPTS: Record<FieldKey, string> = {
  value_add:
    "You're helping a dental staff candidate answer: 'What unique skill or quality do you bring to a practice?' Ask one short, specific follow-up question to draw out a concrete example (not generic traits like 'hardworking'), OR if they've given you enough, propose a tightened 2-3 sentence draft in their own voice for them to edit. Keep your own response under 60 words.",
  future_goals:
    "You're helping a dental staff candidate answer: 'Where do you want to be in your career in 2 years?' Ask one short follow-up to make a vague answer concrete (e.g. 'growing professionally' -> what specifically: clinical specialty, leadership, mentoring?), OR propose a tightened draft. Keep your response under 60 words.",
  recovery_scenario:
    "You're helping a dental staff candidate answer: 'If a practice is struggling with low patient volume or dipping production, how would you help bring revenue back up?' This is the platform's signature question -- push for a specific, actionable answer (e.g. a concrete process, not 'work harder'). Ask one sharp follow-up or propose a tightened draft. Keep your response under 60 words.",
  culture:
    "You're helping a dental practice owner describe their workplace culture honestly, for a staffing platform where candidates can see this before applying. Ask one follow-up to get past generic phrases like 'great team environment', or propose a tightened, specific, honest draft. Keep your response under 60 words.",
  thrive:
    "You're helping a dental practice owner answer: 'What would make someone thrive here?' Push for specifics about pace, autonomy, team dynamics -- not generic positivity. Ask one follow-up or propose a tightened draft. Keep your response under 60 words.",
  honest_challenges:
    "You're helping a dental practice owner honestly describe what's hard about working at their practice (e.g. high patient volume, demanding schedule). This builds trust with candidates by setting real expectations. Ask one gentle follow-up if their answer is too vague or defensive, or propose a tightened, honest draft. Keep your response under 60 words.",
};

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { field, draftText, conversationHistory } = body as {
    field: FieldKey;
    draftText: string;
    conversationHistory?: { role: "user" | "assistant"; content: string }[];
  };

  if (!field || !(field in FIELD_PROMPTS)) {
    return NextResponse.json({ error: "Invalid field" }, { status: 400 });
  }

  const system = `You are a warm, sharp writing coach embedded in a dental staffing platform's onboarding flow. ${FIELD_PROMPTS[field]} Never write the final answer FOR them without an explicit draft they can still edit. Never pad with encouragement-filler ("Great start!"). Be direct and specific.`;

  try {
    const reply = await complete({
      system,
      messages: [
        ...(conversationHistory ?? []),
        { role: "user", content: draftText || "(no draft yet -- I'm not sure what to write)" },
      ],
      maxTokens: 200,
      temperature: 0.7,
    });

    return NextResponse.json({ reply });
  } catch (err) {
    console.error("onboarding-assist error", err);
    return NextResponse.json(
      { error: "AI assist is temporarily unavailable. You can still write this yourself and continue." },
      { status: 502 }
    );
  }
}
