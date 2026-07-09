"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft, MapPin, GraduationCap, Plane, Home as HomeIcon, Briefcase,
  Wrench, Pencil, Calendar, Share2, Copy, Check, X,
} from "lucide-react";
import { DAYS_OF_WEEK } from "@/lib/constants";
import { ReviewRatingSummary, ReviewList, type ReviewItem } from "@/components/shared/review-list";
import { CompanyFavicon } from "@/components/shared/company-favicon";
import { SkillChips } from "@/components/shared/skill-chips";
import { CandidatePedigree } from "@/components/shared/candidate-pedigree";

interface SelfProfile {
  id: string;
  full_name: string;
  photo_url: string | null;
  city: string;
  state: string;
  years_experience: number | null;
  pay_range_min: number | null;
  pay_range_max: number | null;
  pay_unit: string | null;
  collections_percent: number | null;
  collections_note: string | null;
  open_to_relocation: boolean;
  open_to_remote: boolean;
  employment_types: string[];
  university: string | null;
  certifications: string[];
  ce_courses: string[];
  skills: string[];
  hobbies: string[];
  ai_skill_chips: string[] | null;
  value_add_text: string | null;
  future_goals_text: string | null;
  recovery_scenario_text: string | null;
  ideal_practice_text: string | null;
  profile_completeness_score: number;
  role?: { label: string };
  work_history?: { employer_name: string; role_title: string | null; company_website: string | null; start_date: string | null; end_date: string | null }[];
  dealbreakers?: { dealbreaker_tags: { label: string } }[];
  software?: { software_tags: { label: string } }[];
  availability?: { day_of_week: number; start_time: string; end_time: string }[];
}

function initials(name: string) {
  return name.split(" ").map((p) => p[0]).join("").slice(0, 2).toUpperCase();
}

function formatTime(t: string) {
  return t.slice(0, 5);
}

function formatDateRange(start: string | null, end: string | null) {
  return `${start ?? ""} – ${end || "Present"}`;
}

export default function CandidateSelfViewPage() {
  const [profile, setProfile] = useState<SelfProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [candidateId, setCandidateId] = useState<string | null>(null);
  const [reviews, setReviews] = useState<ReviewItem[]>([]);
  const [averageRating, setAverageRating] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetch("/api/candidate/profile/me")
      .then((res) => res.json())
      .then((data) => {
        setProfile(data.profile);
        if (data.profile?.id) {
          setCandidateId(data.profile.id);
          // Reviews are fetched via the same public endpoint the
          // shareable link uses -- the candidate viewing their own
          // profile sees exactly what a public visitor would see,
          // plus the flagging action (allowFlagging below).
          fetch(`/api/reviews/${data.profile.id}`)
            .then((res) => res.json())
            .then((reviewData) => {
              setReviews(reviewData.reviews ?? []);
              setAverageRating(reviewData.averageRating ?? null);
            })
            .catch(() => {});
        }
      })
      .finally(() => setLoading(false));
  }, []);

  function copyShareLink() {
    if (!candidateId) return;
    navigator.clipboard.writeText(`${window.location.origin}/review/${candidateId}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (loading) {
    return <div className="max-w-2xl mx-auto px-5 py-16 text-center text-ink-faint">Loading…</div>;
  }

  if (!profile) {
    return (
      <div className="max-w-2xl mx-auto px-5 py-16 text-center">
        <p className="mb-4 text-[14px]">You haven&apos;t set up your profile yet.</p>
        <Link href="/onboarding/candidate" className="text-teal-deep font-semibold text-[14px]">
          Get started →
        </Link>
      </div>
    );
  }

  const payLabel =
    profile.pay_unit === "custom"
      ? [
          profile.collections_percent ? `${profile.collections_percent}% of collections` : null,
          profile.collections_note,
        ].filter(Boolean).join(" -- ")
      : profile.pay_range_min && profile.pay_range_max
      ? `$${profile.pay_range_min}–${profile.pay_range_max}${profile.pay_unit === "hourly" ? "/hr" : "/yr"}`
      : null;

  return (
    <div className="max-w-2xl mx-auto px-5 md:px-0 py-7 md:py-12">
      <div className="flex items-center justify-between mb-6">
        <Link href="/candidate/dashboard" className="flex items-center gap-1.5 text-[13px] text-ink-faint hover:text-ink">
          <ArrowLeft size={14} /> Back to dashboard
        </Link>
        <Link
          href="/candidate/settings/edit"
          className="flex items-center gap-1.5 text-[13px] font-semibold text-teal-deep"
        >
          <Pencil size={13} /> Edit
        </Link>
      </div>

      <div className="rounded-2xl bg-teal-tint/40 border border-teal-tint p-4 mb-6 text-[12.5px] text-teal-deep">
        This is exactly what a practice sees once they unlock your profile -- your own preview.
      </div>

      <div className="mb-2 flex items-center gap-2">
        <div className="h-2 flex-1 bg-line-soft rounded-full overflow-hidden">
          <div className="h-full bg-teal" style={{ width: `${profile.profile_completeness_score}%` }} />
        </div>
        <span className="text-[12px] text-ink-faint shrink-0">{profile.profile_completeness_score}% complete</span>
      </div>

      <div className="rounded-2xl border border-line bg-bg-raised p-4 mb-6 mt-6 flex items-center gap-3">
        <Share2 size={16} className="text-teal-deep shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-semibold">Share your review link</p>
          <p className="text-[12px] text-ink-faint">Patients or coworkers can leave a public review -- no account needed.</p>
        </div>
        <button
          onClick={copyShareLink}
          className="flex items-center gap-1.5 text-[12.5px] font-semibold text-teal-deep border border-teal/30 bg-teal-tint px-3 py-2 rounded-control shrink-0 hover:bg-teal-tint/70 transition-colors"
        >
          {copied ? <Check size={13} /> : <Copy size={13} />}
          {copied ? "Copied" : "Copy link"}
        </button>
      </div>

      {/* Header -- restructured to match the owner-facing redesign:
          name/role, then rating summary right in the header rather
          than buried near the bottom. */}
      <div className="flex gap-4 items-start mb-4 mt-6">
        <div className="w-16 h-16 rounded-full overflow-hidden bg-gradient-to-br from-teal to-teal-deep flex items-center justify-center shrink-0">
          {profile.photo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={profile.photo_url} alt={profile.full_name} className="w-full h-full object-cover" />
          ) : (
            <span className="text-white font-serif text-xl">{initials(profile.full_name)}</span>
          )}
        </div>
        <div className="flex-1 pt-1">
          <h1 className="font-serif text-2xl font-bold mb-1">{profile.full_name}</h1>
          <p className="text-[15px] text-ink-faint mb-1.5">{profile.role?.label}</p>
          <ReviewRatingSummary averageRating={averageRating} reviewCount={reviews.length} />
        </div>
      </div>

      {/* Above-the-fold summary strip -- dealbreakers, AI standout
          chips, and relocation/remote status, matching the exact same
          placement principle as the owner-facing redesign: this is
          what a practice sees FIRST, so it's what you should see
          first reviewing your own profile too, not buried after
          several paragraphs of text. */}
      {(profile.dealbreakers?.length ?? 0) > 0 ||
      (profile.ai_skill_chips?.length ?? 0) > 0 ||
      profile.open_to_relocation ||
      profile.open_to_remote ? (
        <div className="space-y-2.5 mb-5">
          {profile.dealbreakers && profile.dealbreakers.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {profile.dealbreakers.map((d, i) => (
                <span
                  key={i}
                  className="flex items-center gap-1.5 text-[12.5px] font-medium text-coral-deep bg-coral/10 px-3 py-1.5 rounded-full"
                >
                  <X size={11} /> {d.dealbreaker_tags.label}
                </span>
              ))}
            </div>
          )}
          <div className="flex flex-wrap items-center gap-1.5">
            {profile.open_to_relocation && (
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-teal-deep bg-teal-tint px-2.5 py-1 rounded-md">
                <Plane size={11} /> Open to relocation
              </span>
            )}
            {profile.open_to_remote && (
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-teal-deep bg-teal-tint px-2.5 py-1 rounded-md">
                <HomeIcon size={11} /> Open to remote
              </span>
            )}
            <SkillChips chips={profile.ai_skill_chips} />
          </div>
        </div>
      ) : null}

      <div className="flex gap-5 text-[13.5px] text-ink-faint mb-5">
        <span className="flex items-center gap-1.5"><MapPin size={14} /> {profile.city}, {profile.state}</span>
        {profile.years_experience != null && (
          <span className="flex items-center gap-1.5"><GraduationCap size={14} /> {profile.years_experience} yrs experience</span>
        )}
      </div>

      {payLabel && <div className="text-[17px] font-semibold text-teal-deep mb-8">{payLabel}</div>}

      <div className="space-y-5 mb-8">
        {profile.value_add_text && (
          <div className="rounded-2xl bg-line-soft border-l-4 border-gold p-5">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-faint mb-2">What you bring</p>
            <p className="text-[15.5px] leading-relaxed text-ink whitespace-pre-wrap">{profile.value_add_text}</p>
          </div>
        )}
        {profile.recovery_scenario_text && (
          <div className="rounded-2xl bg-teal-tint border-l-4 border-teal p-5">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-teal-deep mb-2">Your recovery plan</p>
            <p className="text-[15.5px] leading-relaxed text-ink whitespace-pre-wrap">{profile.recovery_scenario_text}</p>
          </div>
        )}
        {profile.ideal_practice_text && (
          <div className="rounded-2xl border border-line p-5">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-faint mb-2">Your ideal practice</p>
            <p className="text-[14.5px] leading-relaxed text-ink whitespace-pre-wrap">{profile.ideal_practice_text}</p>
          </div>
        )}
        {profile.future_goals_text && (
          <div className="rounded-2xl border border-line p-5">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-faint mb-2">Where you want to be in 2 years</p>
            <p className="text-[14.5px] leading-relaxed text-ink whitespace-pre-wrap">{profile.future_goals_text}</p>
          </div>
        )}
      </div>

      {profile.availability && profile.availability.length > 0 && (
        <div className="mb-8">
          <p className="text-[13px] font-semibold text-ink-soft mb-2.5 flex items-center gap-1.5">
            <Calendar size={13} /> Availability
          </p>
          <div className="flex flex-wrap gap-2">
            {profile.availability.map((a, i) => (
              <span key={i} className="text-[12.5px] bg-line-soft px-2.5 py-1.5 rounded-lg">
                {DAYS_OF_WEEK.find((d) => d.value === a.day_of_week)?.label} {formatTime(a.start_time)}–{formatTime(a.end_time)}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Work history -- threaded timeline with employer favicons,
          matching the owner-facing redesign exactly rather than the
          flat list this page had before. */}
      {profile.work_history && profile.work_history.length > 0 && (
        <div className="mb-8">
          <p className="text-[13px] font-semibold text-ink-soft mb-4 flex items-center gap-1.5">
            <Briefcase size={13} /> Work history
          </p>
          <div className="relative pl-1">
            <div className="absolute left-[19px] top-2 bottom-2 w-px bg-line" aria-hidden="true" />
            <div className="space-y-5">
              {profile.work_history.map((w, i) => (
                <div key={i} className="relative flex gap-3.5">
                  <div className="relative z-10 bg-bg">
                    <CompanyFavicon url={w.company_website} size={22} />
                  </div>
                  <div className="flex-1 min-w-0 pb-0.5">
                    <div className="flex items-baseline justify-between gap-3 flex-wrap">
                      <span className="font-semibold text-[14px]">{w.employer_name}</span>
                      <span className="text-ink-faint text-[12.5px] shrink-0">
                        {formatDateRange(w.start_date, w.end_date)}
                      </span>
                    </div>
                    {w.role_title && <p className="text-ink-faint text-[13px]">{w.role_title}</p>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Skills / hobbies / certifications / CE courses / education --
          shared component, same as the owner-facing redesign, instead
          of this page's own separate ad-hoc flat lists. */}
      <div className="mb-10 space-y-6">
        <CandidatePedigree
          university={profile.university}
          certifications={profile.certifications ?? []}
          ceCourses={profile.ce_courses ?? []}
          skills={profile.skills ?? []}
          hobbies={profile.hobbies ?? []}
        />
        {profile.software && profile.software.length > 0 && (
          <div>
            <p className="text-[12px] font-semibold text-ink-soft mb-2 flex items-center gap-1.5">
              <Wrench size={12} /> Software
            </p>
            <div className="flex flex-wrap gap-1.5">
              {profile.software.map((s, i) => (
                <span key={i} className="text-[12.5px] bg-line-soft px-2.5 py-1 rounded-md">{s.software_tags.label}</span>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="pt-2 border-t border-line">
        <p className="text-[13px] font-semibold text-ink-soft mb-4 mt-6">Reviews</p>
        <ReviewList reviews={reviews} allowFlagging />
      </div>
    </div>
  );
}
