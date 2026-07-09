import { Sparkles } from "lucide-react";

/**
 * The AI-generated standout-trait chips (src/lib/ai/skill-chips.ts),
 * rendered identically wherever they appear -- browse card and full
 * profile both use this same component so the two surfaces can't drift
 * in styling, per the original requirement that these show in both
 * places.
 */
export function SkillChips({ chips }: { chips: string[] | null }) {
  if (!chips || chips.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1.5">
      {chips.map((chip, i) => (
        <span
          key={i}
          className="inline-flex items-center gap-1 text-[11px] font-semibold bg-gold/10 px-2.5 py-1 rounded-full"
          style={{ color: "#8a6d20" }} // darker than --color-gold (#C9A24B) for text contrast on its own light background -- no "gold-deep" token exists in globals.css to reach for instead
        >
          <Sparkles size={10} /> {chip}
        </span>
      ))}
    </div>
  );
}
