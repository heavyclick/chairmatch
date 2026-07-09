import { complete } from "@/lib/ai/provider";

interface PracticeChipSourceData {
  specialty: string | null;
  cultureText: string | null;
  thriveText: string | null;
  software: string[];
  googleRating: number | null;
  googleRatingCount: number | null;
}

/**
 * Infers 2-4 short standout chips summarizing what's distinctive about
 * a practice -- the practice-side mirror of generateSkillChips
 * (src/lib/ai/skill-chips.ts), shown identically via the same
 * SkillChips component so both sides of the marketplace present this
 * kind of signal the same way.
 *
 * Same design principles as the candidate version: synthesis, not a
 * verbatim restatement (not just "General dentistry" copied from
 * specialty), prioritizing what's actually distinctive over generic
 * traits every practice would claim. Fails soft -- null on any error,
 * never blocks a profile save.
 */
export async function generatePracticeChips(data: PracticeChipSourceData): Promise<string[] | null> {
  const hasEnoughToWorkWith =
    (data.cultureText?.trim().length ?? 0) > 20 ||
    (data.thriveText?.trim().length ?? 0) > 20 ||
    data.software.length > 0;
  if (!hasEnoughToWorkWith) return null;

  const facts = [
    data.specialty ? `Specialty: ${data.specialty.replace(/_/g, " ")}` : null,
    data.software.length ? `Software used: ${data.software.join(", ")}` : null,
    data.googleRating != null
      ? `Google rating: ${data.googleRating.toFixed(1)} (${data.googleRatingCount ?? 0} reviews)`
      : null,
    data.cultureText ? `In their own words, culture: "${data.cultureText}"` : null,
    data.thriveText ? `In their own words, what helps someone thrive there: "${data.thriveText}"` : null,
  ]
    .filter(Boolean)
    .join("\n");

  try {
    const raw = await complete({
      system:
        `You summarize dental practices' standout qualities as short chip labels for a hiring marketplace, shown to job candidates evaluating where to work. ` +
        `Given the practice's facts below, output 2 to 4 SHORT chips (2-4 words each) capturing what's most distinctive about working there -- not a generic restatement of their specialty, and not simply "great culture" or other claims every practice would make. Prioritize concrete, specific signals (a strong Google rating with real review volume, a named software stack, a specific cultural trait actually described in their own words) over vague positivity. If the source text doesn't support a specific claim, don't invent one -- fewer, more honest chips are better than generic filler. ` +
        `Respond with ONLY a JSON array of strings, nothing else. Example: ["4.8★ (120+ reviews)", "Uses Dentrix + Invisalign", "Mentorship-focused culture"]`,
      messages: [{ role: "user", content: facts }],
      maxTokens: 120,
      temperature: 0.5,
    });

    const cleaned = raw.trim().replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
    const parsed = JSON.parse(cleaned);
    if (!Array.isArray(parsed) || !parsed.every((c) => typeof c === "string")) {
      return null;
    }
    return parsed.slice(0, 4).map((c) => c.trim()).filter(Boolean);
  } catch (err) {
    console.error("[practice-chips] generation failed, leaving profile without chips:", err);
    return null;
  }
}
