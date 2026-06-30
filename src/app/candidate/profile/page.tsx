"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft, MapPin, GraduationCap, Plane, Home as HomeIcon, Briefcase,
  Wrench, Heart, ShieldAlert, Pencil, Calendar, Share2, Copy, Check,
} from "lucide-react";
import { DAYS_OF_WEEK } from "@/lib/constants";
import { ReviewSummaryAndList, type ReviewItem } from "@/components/shared/review-list";

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

      <div className="flex gap-4 items-start mb-6 mt-6">
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
          <p className="text-[15px] text-ink-faint">{profile.role?.label}</p>
          <div className="flex gap-2 mt-2 flex-wrap">
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
          </div>
        </div>
      </div>

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
            <p className="text-[15.5px] leading-relaxed text-ink">{profile.value_add_text}</p>
          </div>
        )}
        {profile.recovery_scenario_text && (
          <div className="rounded-2xl bg-teal-tint border-l-4 border-teal p-5">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-teal-deep mb-2">Your recovery plan</p>
            <p className="text-[15.5px] leading-relaxed text-ink">{profile.recovery_scenario_text}</p>
          </div>
        )}
        {profile.ideal_practice_text && (
          <div className="rounded-2xl border border-line p-5">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-faint mb-2">Your ideal practice</p>
            <p className="text-[14.5px] leading-relaxed text-ink">{profile.ideal_practice_text}</p>
          </div>
        )}
        {profile.future_goals_text && (
          <div className="rounded-2xl border border-line p-5">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-faint mb-2">Where you want to be in 2 years</p>
            <p className="text-[14.5px] leading-relaxed text-ink">{profile.future_goals_text}</p>
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
                {DAYS_OF_WEEK.find((d) => d.value === a.day_of_week)?.label} {a.start_time}–{a.end_time}
              </span>
            ))}
          </div>
        </div>
      )}

      {profile.dealbreakers && profile.dealbreakers.length > 0 && (
        <div className="mb-8">
          <p className="text-[13px] font-semibold text-ink-soft mb-2.5 flex items-center gap-1.5">
            <ShieldAlert size={13} /> Dealbreakers
          </p>
          <div className="flex flex-wrap gap-2">
            {profile.dealbreakers.map((d, i) => (
              <span key={i} className="text-[12.5px] font-medium text-coral-deep bg-coral/10 px-3 py-1.5 rounded-full">
                {d.dealbreaker_tags.label}
              </span>
            ))}
          </div>
        </div>
      )}

      {profile.work_history && profile.work_history.length > 0 && (
        <div className="mb-8">
          <p className="text-[13px] font-semibold text-ink-soft mb-3 flex items-center gap-1.5">
            <Briefcase size={13} /> Work history
          </p>
          <div className="space-y-3">
            {profile.work_history.map((w, i) => (
              <div key={i} className="text-[14px]">
                <div className="flex justify-between">
                  <span className="font-semibold">{w.employer_name}</span>
                  <span className="text-ink-faint text-[13px]">{w.start_date} – {w.end_date || "Present"}</span>
                </div>
                {w.role_title && <p className="text-ink-faint text-[13px]">{w.role_title}</p>}
                {w.company_website && (
                  <a href={w.company_website} target="_blank" rel="noreferrer" className="text-teal-deep text-[12.5px]">
                    {w.company_website}
                  </a>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
        {(profile.certifications?.length > 0 || profile.ce_courses?.length > 0 || profile.university || profile.skills?.length > 0) && (
          <div>
            <p className="text-[13px] font-semibold text-ink-soft mb-2.5 flex items-center gap-1.5">
              <GraduationCap size={13} /> Education & skills
            </p>
            <ul className="text-[14px] text-ink space-y-1">
              {profile.university && <li>{profile.university}</li>}
              {profile.skills?.map((s, i) => <li key={`s-${i}`}>{s}</li>)}
              {profile.certifications?.map((c, i) => <li key={`c-${i}`}>{c}</li>)}
              {profile.ce_courses?.map((c, i) => <li key={`ce-${i}`}>{c}</li>)}
            </ul>
          </div>
        )}

        {profile.software && profile.software.length > 0 && (
          <div>
            <p className="text-[13px] font-semibold text-ink-soft mb-2.5 flex items-center gap-1.5">
              <Wrench size={13} /> Software
            </p>
            <div className="flex flex-wrap gap-1.5">
              {profile.software.map((s, i) => (
                <span key={i} className="text-[12.5px] bg-line-soft px-2.5 py-1 rounded-md">{s.software_tags.label}</span>
              ))}
            </div>
          </div>
        )}

        {profile.hobbies && profile.hobbies.length > 0 && (
          <div>
            <p className="text-[13px] font-semibold text-ink-soft mb-2.5 flex items-center gap-1.5">
              <Heart size={13} /> Hobbies & interests
            </p>
            <div className="flex flex-wrap gap-1.5">
              {profile.hobbies.map((h, i) => (
                <span key={i} className="text-[12.5px] bg-line-soft px-2.5 py-1 rounded-md">{h}</span>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="pt-2 border-t border-line">
        <p className="text-[13px] font-semibold text-ink-soft mb-4 mt-6">Reviews</p>
        <ReviewSummaryAndList reviews={reviews} averageRating={averageRating} allowFlagging />
      </div>
    </div>
  );
}
