import { CandidateCard } from "@/components/owner/candidate-card";
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
    <div className="max-w-5xl mx-auto px-6 md:px-10 py-10 md:py-14">
      <div className="mb-10">
        <p className="text-sm text-ink-faint mb-1">Good morning, Bright Smiles Dental</p>
        <h1 className="font-serif text-3xl font-semibold">Find your next hire</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {SAMPLE_CANDIDATES.map((c) => (
          <CandidateCard key={c.id} candidate={c} />
        ))}
      </div>
    </div>
  );
}
