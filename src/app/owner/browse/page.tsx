import { SlidersHorizontal } from "lucide-react";
import { CandidateCard } from "@/components/owner/candidate-card";
import { LiveStatHero } from "@/components/owner/live-stat-hero";
import { ROLES, SOFTWARE_OPTIONS } from "@/lib/constants";
import type { CandidateProfile, BlurredCandidateProfile } from "@/types/database";

// Static sample data for local scaffolding/visual work before Supabase
// is connected. Swap for a real fetch("/api/search") call once the
// database has seed data -- see supabase/seed/.
const SAMPLE_CANDIDATES: (CandidateProfile | BlurredCandidateProfile)[] = [
  {
    id: "1",
    full_name: "Jasmine M.",
    photo_url: null,
    primary_role_id: 2,
    role: { id: 2, slug: "hygienist", label: "Dental Hygienist, RDH" },
    city: "Houston",
    state: "TX",
    zip: "77001",
    employment_types: ["full_time"],
    open_to_relocation: false,
    pay_range_min: 48,
    pay_range_max: 52,
    pay_unit: "hourly",
    university: null,
    certifications: [],
    ce_courses: [],
    years_experience: 6,
    value_add_text:
      "I track unscheduled treatment weekly and follow up personally -- it helped my last office recover six lost patients in a month.",
    future_goals_text: null,
    recovery_scenario_text: null,
    visibility_status: "actively_looking",
    profile_completeness_score: 90,
    created_at: "",
    updated_at: "",
  },
  {
    id: "2",
    primary_role_id: 2,
    role: { id: 2, slug: "hygienist", label: "Dental Hygienist, RDH" },
    city: "Houston",
    state: "TX",
    zip: "77002",
    employment_types: ["full_time"],
    open_to_relocation: true,
    pay_range_min: 50,
    pay_range_max: 58,
    pay_unit: "hourly",
    university: null,
    certifications: [],
    ce_courses: [],
    years_experience: 9,
    value_add_text:
      "I see myself eventually mentoring newer hygienists -- I love the teaching side almost as much as the clinical side.",
    future_goals_text: null,
    recovery_scenario_text: null,
    visibility_status: "actively_looking",
    profile_completeness_score: 85,
    created_at: "",
    updated_at: "",
    full_name: null,
    photo_url: null,
    is_locked: true,
  } as BlurredCandidateProfile,
];

export default function BrowsePage() {
  return (
    <div className="max-w-5xl mx-auto px-5 md:px-10 py-7 md:py-12">
      <div className="mb-7 md:mb-10">
        <p className="text-[13px] text-ink-faint mb-1">
          Good morning, Bright Smiles Dental
        </p>
        <h1 className="font-serif text-2xl md:text-3xl font-semibold">
          Find your next hire
        </h1>
      </div>

      <div className="mb-12 md:mb-14">
        <LiveStatHero
          location="Houston, TX"
          radiusMiles={15}
          stats={[
            { count: 47, label: "Hygienists" },
            { count: 33, label: "Front desk" },
            { count: 19, label: "Office managers" },
            { count: 12, label: "Dental assistants" },
          ]}
        />
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3 mb-5">
        <div className="flex gap-1 bg-line-soft p-1 rounded-xl">
          {["Full-Time", "Part-Time", "Temp"].map((t, i) => (
            <div
              key={t}
              className={`px-4 py-2 rounded-lg text-[13.5px] font-semibold cursor-pointer transition-colors ${
                i === 0
                  ? "bg-bg-raised text-ink shadow-sm"
                  : "text-ink-faint hover:text-ink"
              }`}
            >
              {t}
            </div>
          ))}
        </div>

        <button className="flex items-center gap-2 rounded-[11px] border border-line bg-bg-raised px-4 py-2.5 text-[13.5px] font-semibold">
          <SlidersHorizontal size={14} />
          Filters
          <span className="w-[18px] h-[18px] rounded-full bg-teal text-white text-[10.5px] font-bold flex items-center justify-center">
            3
          </span>
        </button>

        <span className="text-[13px] text-ink-faint md:ml-auto">
          142 results · {ROLES.length} roles · {SOFTWARE_OPTIONS.length} software systems tracked
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {SAMPLE_CANDIDATES.map((c) => (
          <CandidateCard key={c.id} candidate={c} />
        ))}
      </div>
    </div>
  );
}
