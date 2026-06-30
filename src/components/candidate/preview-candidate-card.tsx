import { Lock, MapPin, GraduationCap, Plane } from "lucide-react";
import type { CandidateProfile, BlurredCandidateProfile } from "@/types/database";

/**
 * Read-only version of the owner-side CandidateCard, used only for the
 * candidate-facing "see what owners see" browse preview
 * (/candidate/browse-preview). Deliberately has no click-through, no
 * messaging, no unlock modal -- those all assume an owner session and
 * would be meaningless (or actively confusing) here. Kept as a
 * separate component rather than adding a "readOnly" prop branch to
 * the real CandidateCard, since that card is load-bearing for the
 * actual paywall UI and shouldn't grow conditional branches for an
 * unrelated, lower-stakes preview feature.
 */
export function PreviewCandidateCard({
  candidate,
}: {
  candidate: CandidateProfile | BlurredCandidateProfile;
}) {
  const locked = "is_locked" in candidate && candidate.is_locked === true;
  const payLabel =
    candidate.pay_range_min && candidate.pay_range_max
      ? `$${candidate.pay_range_min}–${candidate.pay_range_max}${candidate.pay_unit === "hourly" ? "/hr" : "/yr"}`
      : null;

  function initials(name: string) {
    return name.split(" ").map((p) => p[0]).join("").slice(0, 2).toUpperCase();
  }

  return (
    <div className="rounded-card border border-line bg-bg-raised p-6 flex flex-col">
      <div className="flex gap-3.5 mb-4">
        <div className="relative shrink-0">
          <div
            className={`w-13 h-13 rounded-full flex items-center justify-center font-serif text-lg text-white ${
              locked ? "bg-gradient-to-br from-ink-faint to-ink-soft locked-blur" : "bg-gradient-to-br from-teal to-teal-deep"
            }`}
          >
            {locked || !candidate.full_name ? "" : initials(candidate.full_name)}
          </div>
          {locked && (
            <div className="absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full bg-ink text-white flex items-center justify-center border-2 border-bg-raised">
              <Lock size={10} />
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0 pt-0.5">
          <div className={`text-base font-semibold mb-0.5 ${locked ? "locked-text" : ""}`}>
            {locked ? "█████ ███" : candidate.full_name}
          </div>
          <div className="text-sm text-ink-faint">{candidate.role?.label}</div>
          {candidate.open_to_relocation && (
            <span className="inline-flex items-center gap-1 text-[10.5px] font-semibold text-teal-deep bg-teal-tint px-2 py-0.5 rounded-md mt-1.5">
              <Plane size={10} /> Open to relocation
            </span>
          )}
        </div>
      </div>

      <div className="flex gap-3.5 text-xs text-ink-faint mb-3.5">
        {candidate.city && (
          <span className="flex items-center gap-1"><MapPin size={12} /> {candidate.city}, {candidate.state}</span>
        )}
        {candidate.years_experience != null && (
          <span className="flex items-center gap-1"><GraduationCap size={12} /> {candidate.years_experience} yrs exp</span>
        )}
      </div>

      {payLabel && <div className="text-sm font-semibold text-teal-deep mb-4">{payLabel}</div>}

      {candidate.value_add_text && (
        <blockquote className="font-serif italic text-[14.5px] leading-relaxed text-ink bg-line-soft border-l-3 border-gold rounded-r-lg px-3.5 py-3 flex-1">
          &ldquo;{candidate.value_add_text}&rdquo;
        </blockquote>
      )}
    </div>
  );
}
