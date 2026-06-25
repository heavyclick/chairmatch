import { Lock, MapPin, GraduationCap, Plane } from "lucide-react";
import type { CandidateProfile, BlurredCandidateProfile } from "@/types/database";
import { cn } from "@/lib/utils";

type CardProps = {
  candidate: CandidateProfile | BlurredCandidateProfile;
};

function isLocked(
  c: CandidateProfile | BlurredCandidateProfile
): c is BlurredCandidateProfile {
  return "is_locked" in c && c.is_locked === true;
}

function initials(name: string) {
  return name
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export function CandidateCard({ candidate }: CardProps) {
  const locked = isLocked(candidate);
  const payLabel =
    candidate.pay_range_min && candidate.pay_range_max
      ? `$${candidate.pay_range_min}–${candidate.pay_range_max}${
          candidate.pay_unit === "hourly" ? "/hr" : "/yr"
        }`
      : null;

  return (
    <div className="group rounded-card border border-line bg-bg-raised p-6 transition hover:-translate-y-0.5 hover:shadow-lg hover:shadow-ink/5 hover:border-line cursor-pointer flex flex-col">
      <div className="flex gap-3.5 mb-4">
        <div className="relative shrink-0">
          <div
            className={cn(
              "w-13 h-13 rounded-full flex items-center justify-center font-serif text-lg text-white",
              locked
                ? "bg-gradient-to-br from-ink-faint to-ink-soft locked-blur"
                : "bg-gradient-to-br from-teal to-teal-deep"
            )}
          >
            {locked ? "" : initials(candidate.full_name)}
          </div>
          {locked && (
            <div className="absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full bg-ink text-white flex items-center justify-center border-2 border-bg-raised">
              <Lock size={10} />
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0 pt-0.5">
          <div
            className={cn(
              "text-base font-semibold mb-0.5",
              locked && "locked-text"
            )}
          >
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
          <span className="flex items-center gap-1">
            <MapPin size={12} /> {candidate.city}, {candidate.state}
          </span>
        )}
        {candidate.years_experience != null && (
          <span className="flex items-center gap-1">
            <GraduationCap size={12} /> {candidate.years_experience} yrs exp
          </span>
        )}
      </div>

      {payLabel && (
        <div className="text-sm font-semibold text-teal-deep mb-4">
          {payLabel}
        </div>
      )}

      {candidate.value_add_text && (
        <blockquote className="font-serif italic text-[14.5px] leading-relaxed text-ink bg-line-soft border-l-3 border-gold rounded-r-lg px-3.5 py-3 mb-4 flex-1">
          &ldquo;{candidate.value_add_text}&rdquo;
        </blockquote>
      )}

      <div className="flex gap-2.5 mt-auto">
        {locked ? (
          <button className="flex-1 py-2.5 rounded-control text-sm font-semibold bg-ink text-white hover:bg-teal-deep transition">
            <Lock size={13} className="inline mr-1.5 -mt-0.5" />
            Unlock to contact
          </button>
        ) : (
          <>
            <button className="flex-1 py-2.5 rounded-control text-sm font-semibold border border-line hover:border-teal hover:text-teal-deep transition">
              Shortlist
            </button>
            <button className="flex-1 py-2.5 rounded-control text-sm font-semibold bg-teal text-white hover:bg-teal-deep transition">
              Message
            </button>
          </>
        )}
      </div>
    </div>
  );
}
