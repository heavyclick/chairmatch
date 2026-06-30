"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, MapPin, Stethoscope, Wrench, Pencil, Calendar, Star } from "lucide-react";
import { DAYS_OF_WEEK } from "@/lib/constants";

interface OwnerSelfProfile {
  practice_name: string;
  photo_url: string | null;
  practice_type: string | null;
  specialty: string | null;
  culture_text: string | null;
  thrive_text: string | null;
  honest_challenges_text: string | null;
  ideal_staff_text: string | null;
  subscription_tier: string;
  google_review_url: string | null;
  google_rating: number | null;
  google_rating_count: number | null;
  locations?: { city: string; state: string; zip: string; operating_hours?: { day: number; startTime: string; endTime: string }[] }[];
  software?: { software_tags: { label: string } }[];
  gallery?: { id: string; photo_url: string; caption: string | null }[];
}

export default function OwnerSelfViewPage() {
  const [profile, setProfile] = useState<OwnerSelfProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/owner/profile/me")
      .then((res) => res.json())
      .then((data) => setProfile(data.profile))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="max-w-2xl mx-auto px-5 py-16 text-center text-ink-faint">Loading…</div>;
  }

  if (!profile) {
    return (
      <div className="max-w-2xl mx-auto px-5 py-16 text-center">
        <p className="mb-4 text-[14px]">You haven&apos;t set up your practice profile yet.</p>
        <Link href="/onboarding/owner" className="text-teal-deep font-semibold text-[14px]">
          Get started →
        </Link>
      </div>
    );
  }

  const location = profile.locations?.[0];

  return (
    <div className="max-w-2xl mx-auto px-5 md:px-10 py-7 md:py-12">
      <div className="flex items-center justify-between mb-6">
        <Link href="/owner/dashboard" className="flex items-center gap-1.5 text-[13px] text-ink-faint hover:text-ink">
          <ArrowLeft size={14} /> Back to dashboard
        </Link>
        <Link href="/owner/settings/edit" className="flex items-center gap-1.5 text-[13px] font-semibold text-teal-deep">
          <Pencil size={13} /> Edit
        </Link>
      </div>

      <div className="rounded-2xl bg-teal-tint/40 border border-teal-tint p-4 mb-6 text-[12.5px] text-teal-deep">
        This is exactly what candidates see about your practice.
      </div>

      <div className="flex gap-4 items-start mb-6">
        <div className="w-16 h-16 rounded-2xl overflow-hidden bg-gradient-to-br from-teal to-teal-deep flex items-center justify-center shrink-0">
          {profile.photo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={profile.photo_url} alt={profile.practice_name} className="w-full h-full object-cover" />
          ) : (
            <span className="text-white font-serif text-xl">{profile.practice_name[0]}</span>
          )}
        </div>
        <div className="flex-1 pt-1">
          <h1 className="font-serif text-2xl font-bold mb-1">{profile.practice_name}</h1>
          {location && (
            <p className="text-[14px] text-ink-faint flex items-center gap-1.5">
              <MapPin size={13} /> {location.city}, {location.state} {location.zip}
            </p>
          )}
          {profile.specialty && (
            <p className="text-[13px] text-teal-deep flex items-center gap-1.5 mt-1">
              <Stethoscope size={13} /> {profile.specialty.replace(/_/g, " ")}
            </p>
          )}
          <span className="inline-block mt-2 text-[11px] font-bold uppercase tracking-wide bg-line-soft px-2.5 py-1 rounded-md capitalize">
            {profile.subscription_tier} plan
          </span>
          {profile.google_rating != null && (
            <a
              href={profile.google_review_url ?? undefined}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 ml-2 text-[12.5px] font-semibold text-ink"
            >
              <Star size={13} className="text-gold fill-gold" />
              {profile.google_rating.toFixed(1)}
              <span className="text-ink-faint font-normal">
                ({profile.google_rating_count ?? 0} Google reviews)
              </span>
            </a>
          )}
        </div>
      </div>

      {profile.gallery && profile.gallery.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 mb-8">
          {profile.gallery.map((g) => (
            <div key={g.id} className="rounded-xl overflow-hidden border border-line">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={g.photo_url} alt={g.caption ?? ""} className="w-full h-24 object-cover" />
            </div>
          ))}
        </div>
      )}

      <div className="space-y-5 mb-8">
        {profile.culture_text && (
          <div className="rounded-2xl bg-line-soft border-l-4 border-gold p-5">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-faint mb-2">Culture</p>
            <p className="text-[15px] leading-relaxed text-ink">{profile.culture_text}</p>
          </div>
        )}
        {profile.thrive_text && (
          <div className="rounded-2xl bg-teal-tint border-l-4 border-teal p-5">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-teal-deep mb-2">What helps someone thrive here</p>
            <p className="text-[15px] leading-relaxed text-ink">{profile.thrive_text}</p>
          </div>
        )}
        {profile.ideal_staff_text && (
          <div className="rounded-2xl border border-line p-5">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-faint mb-2">Your ideal staff member</p>
            <p className="text-[15px] leading-relaxed text-ink">{profile.ideal_staff_text}</p>
          </div>
        )}
        {profile.honest_challenges_text && (
          <div className="rounded-2xl border border-line p-5">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-faint mb-2">What&apos;s genuinely hard about this job</p>
            <p className="text-[15px] leading-relaxed text-ink">{profile.honest_challenges_text}</p>
          </div>
        )}
      </div>

      {location?.operating_hours && location.operating_hours.length > 0 && (
        <div className="mb-8">
          <p className="text-[13px] font-semibold text-ink-soft mb-2.5 flex items-center gap-1.5">
            <Calendar size={13} /> Operating hours
          </p>
          <div className="flex flex-wrap gap-2">
            {location.operating_hours.map((h, i) => (
              <span key={i} className="text-[12.5px] bg-line-soft px-2.5 py-1.5 rounded-lg">
                {DAYS_OF_WEEK.find((d) => d.value === h.day)?.label} {h.startTime}–{h.endTime}
              </span>
            ))}
          </div>
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
    </div>
  );
}
