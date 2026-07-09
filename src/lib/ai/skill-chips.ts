import { complete } from "@/lib/ai/provider";

interface ChipSourceData {
  skills: string[];
  software: string[];
  certifications: string[];
  ceCourses: string[];
  yearsExperience: number | null;
  valueAddText: string | null;
  openToRelocation: boolean;
  openToRemote: boolean;
}

/**
 * Infers 2-4 short (2-4 word) standout chips summarizing what's most
 * distinctive/marketable about a candidate -- shown alongside "open to
 * relocation"/"open to remote" on both the browse card and full
 * profile (profile redesign, #22). Deliberately NOT just "list their
 * top 3 skills verbatim" -- the point is a human-readable synthesis
 * (e.g. "Bilingual chairside", "Invisalign-certified", "5+ yrs OMS")
 * that gives an owner something at-a-glance they wouldn't get from
 * scanning a skills list themselves, which is the entire reason this
 * costs an AI call instead of just being a slice of candidate.skills.
 *
 * Fails soft -- returns null on any error (bad AI response, provider
 * down, unparseable output) rather than blocking a profile save. A
 * missing chip set just means the UI shows nothing extra, not a broken
 * profile.
 */
export async function generateSkillChips(data: ChipSourceData): Promise<string[] | null> {
  const hasEnoughToWorkWith =
    data.skills.length > 0 ||
    data.software.length > 0 ||
    data.certifications.length > 0 ||
    (data.valueAddText?.trim().length ?? 0) > 20;
  if (!hasEnoughToWorkWith) return null;

  const facts = [
    data.yearsExperience != null ? `${data.yearsExperience} years of experience` : null,
    data.skills.length ? `Skills: ${data.skills.join(", ")}` : null,
    data.software.length ? `Software: ${data.software.join(", ")}` : null,
    data.certifications.length ? `Certifications: ${data.certifications.join(", ")}` : null,
    data.ceCourses.length ? `CE courses: ${data.ceCourses.join(", ")}` : null,
    data.openToRelocation ? "Open to relocation" : null,
    data.openToRemote ? "Open to remote work" : null,
    data.valueAddText ? `In their own words, what they bring: "${data.valueAddText}"` : null,
  ]
    .filter(Boolean)
    .join("\n");

  try {
    const raw = await complete({
      system:
        `You summarize dental job candidates' standout qualities as short chip labels for a hiring marketplace. ` +
        `Given the candidate's facts below, output 2 to 4 SHORT chips (2-4 words each) capturing what's most distinctive or marketable about them -- not a generic restatement of their job title, and not simply relisting every skill/certification verbatim. Prioritize the rarest or most specific things (a named certification, a language, a specialty, standout tenure) over generic traits every candidate in this field would have. ` +
        `Respond with ONLY a JSON array of strings, nothing else. Example: ["Invisalign-certified", "Bilingual (Spanish)", "8+ yrs pediatric"]`,
      messages: [{ role: "user", content: facts }],
      maxTokens: 120,
      temperature: 0.5,
    });

    // Models sometimes wrap JSON in a code fence despite instructions
    // -- strip that defensively before parsing rather than failing on
    // otherwise-valid output over a formatting quirk.
    const cleaned = raw.trim().replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
    const parsed = JSON.parse(cleaned);
    if (!Array.isArray(parsed) || !parsed.every((c) => typeof c === "string")) {
      return null;
    }
    return parsed.slice(0, 4).map((c) => c.trim()).filter(Boolean);
  } catch (err) {
    console.error("[skill-chips] generation failed, leaving profile without chips:", err);
    return null;
  }
}
