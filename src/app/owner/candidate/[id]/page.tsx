"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft, MapPin, GraduationCap, Plane, Lock, Star,
  MessageSquare, Sparkles, Briefcase, GraduationCap as CapIcon, X,
} from "lucide-react";
import { PricingModal } from "@/components/shared/pricing-modal";
import { ReviewSummaryAndList, type ReviewItem } from "@/components/shared/review-list";

interface DetailCandidate {
  id: string;
  full_name: string | null;
  photo_url: string | null;
  is_locked?: boolean;
  city: string | null;
  state: string | null;
  years_experience: number | null;
  pay_range_min: number | null;
  pay_range_max: number | null;
  pay_unit: "hourly" | "annual" | null;
  open_to_relocation: boolean;
  employment_types: string[];
  value_add_text: string | null;
  future_goals_text: string | null;
  recovery_scenario_text: string | null;
  university: string | null;
  certifications: string[];
  ce_courses: string[];
  role?: { label: string };
  work_history?: { employer_name: string; role_title: string | null; start_date: string | null; end_date: string | null }[];
  dealbreakers?: { dealbreaker_tags: { label: string } }[];
  software?: { software_tags: { label: string } }[];
}

function initials(name: string) {
  return name.split(" ").map((p) => p[0]).join("").slice(0, 2).toUpperCase();
}

function formatDateRange(start: string | null, end: string | null) {
  const fmt = (d: string) => new Date(d).toLocaleDateString("en-US", { month: "short", year: "numeric" });
  return `${start ? fmt(start) : "?"} – ${end ? fmt(end) : "Present"}`;
}

export default function CandidateDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [candidate, setCandidate] = useState<DetailCandidate | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [messaging, setMessaging] = useState(false);
  const [pricingOpen, setPricingOpen] = useState(false);
  const [checkingOut, setCheckingOut] = useState(false);

  async function handleMessage() {
    setMessaging(true);
    try {
      const res = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ candidateId: params.id, body: "Hi! I'd love to learn more about your background." }),
      });
      if (res.ok) {
        const data = await res.json();
        router.push(`/owner/messages/${data.threadId}`);
      }
    } finally {
      setMessaging(false);
    }
  }

  async function handleChoosePlan(kind: "standard" | "pro") {
    setCheckingOut(true);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        alert(data.error || "Couldn't start checkout.");
        setCheckingOut(false);
      }
    } catch {
      alert("Couldn't start checkout -- check your connection and try again.");
      setCheckingOut(false);
    }
  }

  const [reviews, setReviews] = useState<ReviewItem[]>([]);
  const [averageRating, setAverageRating] = useState<number | null>(null);
  const [onRoster, setOnRoster] = useState(false);
  const [addingToRoster, setAddingToRoster] = useState(false);

  async function handleAddToRoster() {
    setAddingToRoster(true);
    try {
      const res = await fetch("/api/owner/roster", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ candidateId: params.id }),
      });
      const data = await res.json();
      if (res.ok) {
        setOnRoster(true);
      } else {
        alert(data.error || "Couldn't add to roster.");
      }
    } finally {
      setAddingToRoster(false);
    }
  }

  useEffect(() => {
    fetch(`/api/candidate/${params.id}`)
      .then(async (res) => {
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || "Couldn't load this profile.");
        }
        return res.json();
      })
      .then((data) => setCandidate(data.candidate))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));

    // Reviews are unlocked-candidates-only in spirit (a free-tier owner
    // can't see who a candidate is anyway), but the public review
    // endpoint doesn't itself check subscription tier -- it's the same
    // public-reads-public-data endpoint the shareable link uses. Showing
    // it regardless of tier is fine here since reviewer identity/rating
    // isn't the gated information; the candidate's OWN identity (name,
    // photo) is, and that's already blurred by /api/candidate/[id]
    // independently of this fetch.
    fetch(`/api/reviews/${params.id}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data) {
          setReviews(data.reviews ?? []);
          setAverageRating(data.averageRating ?? null);
        }
      })
      .catch(() => {});
  }, [params.id]);

  if (loading) {
    return <div className="max-w-2xl mx-auto px-5 py-16 text-center text-ink-faint">Loading profile…</div>;
  }

  if (error || !candidate) {
    return (
      <div className="max-w-2xl mx-auto px-5 py-16 text-center">
        <p className="text-coral-deep mb-4">{error || "Profile not found."}</p>
        <Link href="/owner/browse" className="text-teal-deep font-semibold text-[14px]">
          ← Back to browse
        </Link>
      </div>
    );
  }

  const locked = candidate.is_locked;
  const payLabel =
    candidate.pay_range_min && candidate.pay_range_max
      ? `$${candidate.pay_range_min}–${candidate.pay_range_max}${candidate.pay_unit === "hourly" ? "/hr" : "/yr"}`
      : null;

  return (
    <div className="max-w-2xl mx-auto px-5 md:px-0 py-7 md:py-12">
      <Link href="/owner/browse" className="flex items-center gap-1.5 text-[13px] text-ink-faint hover:text-ink mb-6">
        <ArrowLeft size={14} /> Back to browse
      </Link>

      {/* Header */}
      <div className="flex gap-4 items-start mb-6">
        <div className="relative shrink-0">
          <div
            className={`w-16 h-16 rounded-full flex items-center justify-center font-serif text-xl text-white ${
              locked ? "bg-gradient-to-br from-ink-faint to-ink-soft locked-blur" : "bg-gradient-to-br from-teal to-teal-deep"
            }`}
          >
            {!locked && candidate.full_name ? initials(candidate.full_name) : ""}
          </div>
          {locked && (
            <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-ink text-white flex items-center justify-center border-2 border-bg">
              <Lock size={11} />
            </div>
          )}
        </div>
        <div className="flex-1 pt-1">
          <h1 className={`font-serif text-2xl font-semibold mb-1 ${locked ? "locked-text" : ""}`}>
            {locked ? "█████ ████" : candidate.full_name}
          </h1>
          <p className="text-[15px] text-ink-faint">{candidate.role?.label}</p>
          {candidate.open_to_relocation && (
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-teal-deep bg-teal-tint px-2.5 py-1 rounded-md mt-2">
              <Plane size={11} /> Open to relocation
            </span>
          )}
        </div>
      </div>

      <div className="flex gap-5 text-[13.5px] text-ink-faint mb-5">
        {candidate.city && (
          <span className="flex items-center gap-1.5">
            <MapPin size={14} /> {candidate.city}, {candidate.state}
          </span>
        )}
        {candidate.years_experience != null && (
          <span className="flex items-center gap-1.5">
            <GraduationCap size={14} /> {candidate.years_experience} yrs experience
          </span>
        )}
      </div>

      {payLabel && <div className="text-[17px] font-semibold text-teal-deep mb-8">{payLabel}</div>}

      {/* Qualitative section -- the differentiator, given real visual weight.
          NOTE: no quote marks here, deliberately. Quote-mark styling belongs
          on the browse-card teaser (a real excerpt); this is the complete,
          unedited answer, and dressing it as a "quote" wrongly signals it's
          been clipped, which undercuts the entire "hire for fit" promise. */}
      <div className="space-y-5 mb-8">
        {candidate.value_add_text && (
          <div className="rounded-2xl bg-line-soft border-l-4 border-gold p-5">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-faint mb-2">
              What they bring
            </p>
            <p className="text-[15.5px] leading-relaxed text-ink whitespace-pre-wrap">
              {candidate.value_add_text}
            </p>
          </div>
        )}

        {candidate.recovery_scenario_text && (
          <div className="rounded-2xl bg-teal-tint border-l-4 border-teal p-5">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-teal-deep mb-2">
              If production were dipping, here&apos;s their plan
            </p>
            <p className="text-[15.5px] leading-relaxed text-ink whitespace-pre-wrap">
              {candidate.recovery_scenario_text}
            </p>
          </div>
        )}

        {candidate.future_goals_text && (
          <div className="rounded-2xl border border-line p-5">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-faint mb-2">
              Where they want to be in 2 years
            </p>
            <p className="text-[14.5px] leading-relaxed text-ink whitespace-pre-wrap">{candidate.future_goals_text}</p>
          </div>
        )}
      </div>

      {/* Dealbreakers */}
      {candidate.dealbreakers && candidate.dealbreakers.length > 0 && (
        <div className="mb-8">
          <p className="text-[13px] font-semibold text-ink-soft mb-2.5">Dealbreakers</p>
          <div className="flex flex-wrap gap-2">
            {candidate.dealbreakers.map((d, i) => (
              <span key={i} className="flex items-center gap-1.5 text-[12.5px] font-medium text-coral-deep bg-coral/10 px-3 py-1.5 rounded-full">
                <X size={11} /> {d.dealbreaker_tags.label}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Work history */}
      {candidate.work_history && candidate.work_history.length > 0 && (
        <div className="mb-8">
          <p className="text-[13px] font-semibold text-ink-soft mb-3 flex items-center gap-1.5">
            <Briefcase size={13} /> Work history
          </p>
          <div className="space-y-3">
            {candidate.work_history.map((w, i) => (
              <div key={i} className="flex justify-between text-[14px]">
                <div>
                  <span className="font-semibold">{w.employer_name}</span>
                  {w.role_title && <span className="text-ink-faint"> · {w.role_title}</span>}
                </div>
                <span className="text-ink-faint text-[13px] shrink-0 ml-3">
                  {formatDateRange(w.start_date, w.end_date)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Education / software */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
        {(candidate.certifications?.length > 0 || candidate.ce_courses?.length > 0 || candidate.university) && (
          <div>
            <p className="text-[13px] font-semibold text-ink-soft mb-2.5 flex items-center gap-1.5">
              <CapIcon size={13} /> Education & certifications
            </p>
            <ul className="text-[14px] text-ink space-y-1">
              {candidate.university && <li>{candidate.university}</li>}
              {candidate.certifications?.map((c, i) => <li key={i}>{c}</li>)}
              {candidate.ce_courses?.map((c, i) => <li key={i}>{c}</li>)}
            </ul>
          </div>
        )}

        {candidate.software && candidate.software.length > 0 && (
          <div>
            <p className="text-[13px] font-semibold text-ink-soft mb-2.5">Software experience</p>
            <div className="flex flex-wrap gap-1.5">
              {candidate.software.map((s, i) => (
                <span key={i} className="text-[12.5px] bg-line-soft px-2.5 py-1 rounded-md">
                  {s.software_tags.label}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {(reviews.length > 0 || averageRating != null) && (
        <div className="mb-8 pt-2 border-t border-line">
          <p className="text-[13px] font-semibold text-ink-soft mb-4 mt-6">Reviews</p>
          <ReviewSummaryAndList reviews={reviews} averageRating={averageRating} />
        </div>
      )}

      {/* Sticky action bar */}
      <div className="sticky bottom-4 flex gap-3 bg-bg-raised border border-line rounded-2xl p-3 shadow-lg shadow-ink/5">
        {locked ? (
          <button
            onClick={() => setPricingOpen(true)}
            className="flex-1 py-3 rounded-control text-[14px] font-semibold bg-ink text-white hover:bg-teal-deep transition flex items-center justify-center gap-2"
          >
            <Lock size={14} /> Unlock to contact
          </button>
        ) : (
          <>
            <button
              onClick={handleAddToRoster}
              disabled={addingToRoster || onRoster}
              className={`flex-1 py-3 rounded-control text-[14px] font-semibold border transition flex items-center justify-center gap-2 disabled:opacity-70 ${
                onRoster ? "border-teal text-teal-deep bg-teal-tint" : "border-line hover:border-teal hover:text-teal-deep"
              }`}
            >
              <Star size={14} className={onRoster ? "fill-teal-deep" : ""} />
              {onRoster ? "On roster" : addingToRoster ? "Adding…" : "Add to roster"}
            </button>
            <button
              onClick={handleMessage}
              disabled={messaging}
              className="flex-1 py-3 rounded-control text-[14px] font-semibold bg-teal text-white hover:bg-teal-deep transition flex items-center justify-center gap-2 disabled:opacity-60"
            >
              <MessageSquare size={14} /> {messaging ? "Opening…" : "Message"}
            </button>
            <button className="flex-1 py-3 rounded-control text-[14px] font-semibold border border-line hover:border-teal hover:text-teal-deep transition flex items-center justify-center gap-2">
              <Sparkles size={14} /> AI Screen
            </button>
          </>
        )}
      </div>

      <PricingModal
        open={pricingOpen}
        onClose={() => !checkingOut && setPricingOpen(false)}
        onChoosePlan={handleChoosePlan}
      />
    </div>
  );
}
