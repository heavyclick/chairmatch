import { GraduationCap, Award, BookOpen, Sparkles, Heart } from "lucide-react";

interface PedigreeData {
  university: string | null;
  certifications: string[];
  ceCourses: string[];
  skills: string[];
  hobbies: string[];
}

function Section({
  icon: Icon,
  label,
  items,
}: {
  icon: typeof GraduationCap;
  label: string;
  items: string[];
}) {
  if (items.length === 0) return null;
  return (
    <div>
      <p className="text-[12px] font-semibold text-ink-soft mb-2 flex items-center gap-1.5">
        <Icon size={13} /> {label}
      </p>
      <div className="flex flex-wrap gap-1.5">
        {items.map((item, i) => (
          <span key={i} className="text-[12.5px] bg-line-soft px-2.5 py-1 rounded-md text-ink">
            {item}
          </span>
        ))}
      </div>
    </div>
  );
}

/**
 * Renders skills / hobbies / certifications / CE courses / education as
 * distinct, clearly labeled subsections in a responsive grid -- each
 * category visually separate rather than merged into one list, so an
 * owner can actually tell a CE course apart from a certification apart
 * from a personal interest at a glance.
 */
export function CandidatePedigree({ university, certifications, ceCourses, skills, hobbies }: PedigreeData) {
  const hasAnything =
    university || certifications.length > 0 || ceCourses.length > 0 || skills.length > 0 || hobbies.length > 0;
  if (!hasAnything) return null;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-5">
      {university && (
        <div>
          <p className="text-[12px] font-semibold text-ink-soft mb-2 flex items-center gap-1.5">
            <GraduationCap size={13} /> Education
          </p>
          <p className="text-[13.5px] text-ink">{university}</p>
        </div>
      )}
      <Section icon={Sparkles} label="Skills" items={skills} />
      <Section icon={Award} label="Certifications" items={certifications} />
      <Section icon={BookOpen} label="CE courses" items={ceCourses} />
      <Section icon={Heart} label="Interests" items={hobbies} />
    </div>
  );
}
