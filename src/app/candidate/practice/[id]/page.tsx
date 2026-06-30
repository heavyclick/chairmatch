"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, MapPin, Stethoscope, Wrench, Star } from "lucide-react";

interface PracticeProfile {
  practice_name: string;
  photo_url: string | null;
  practice_type: string | null;
  specialty: string | null;
  culture_text: string | null;
  thrive_text: string | null;
  honest_challenges_text: string | null;
  ideal_staff_text: string | null;
  google_review_url: string | null;
  google_rating: number | null;
  google_rating_count: number | null;
  locations?: { city: string; state: string }[];
  software?: { software_tags: { label: string } }[];
  gallery?: { id: string; photo_url: string; caption: string | null }[];
}

export default function PracticeProfileViewPage() {
  const params = useParams<{ id: string }>();
  const [practice, setPractice] = useState<PracticeProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/practice/${params.id}`)
      .then(async (res) => {
        if (!res.ok) throw new Error("Couldn't load this practice's profile.");
        return res.json();
      })
      .then((data) => setPractice(data.practice))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [params.id]);

  if (loading) {
    return <div className="max-w-2xl mx-auto px-5 py-16 text-center text-ink-faint">Loading…</div>;
  }

  if (error || !practice) {
    return (
      <div className="max-w-2xl mx-auto px-5 py-16 text-center">
        <p className="text-coral-deep mb-4">{error || "Practice not found."}</p>
        <Link href="/candidate/dashboard" className="text-teal-deep font-semibold text-[14px]">
          ← Back to dashboard
        </Link>
      </div>
    );
  }

  const location = practice.locations?.[0];

  return (
    <div className="max-w-2xl mx-auto px-5 md:px-0 py-7 md:py-12">
      <Link href="/candidate/dashboard" className="flex items-center gap-1.5 text-[13px] text-ink-faint hover:text-ink mb-6">
        <ArrowLeft size={14} /> Back
      </Link>

      <div className="flex gap-4 items-start mb-6">
        <div className="w-16 h-16 rounded-2xl overflow-hidden bg-gradient-to-br from-teal to-teal-deep flex items-center justify-center shrink-0">
          {practice.photo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={practice.photo_url} alt={practice.practice_name} className="w-full h-full object-cover" />
          ) : (
            <span className="text-white font-serif text-xl">{practice.practice_name[0]}</span>
          )}
        </div>
        <div className="flex-1 pt-1">
          <h1 className="font-serif text-2xl font-bold mb-1">{practice.practice_name}</h1>
          {location && (
            <p className="text-[14px] text-ink-faint flex items-center gap-1.5">
              <MapPin size={13} /> {location.city}, {location.state}
            </p>
          )}
          {practice.specialty && (
            <p className="text-[13px] text-teal-deep flex items-center gap-1.5 mt-1">
              <Stethoscope size={13} /> {practice.specialty.replace(/_/g, " ")}
            </p>
          )}
          {practice.google_rating != null && (
            <a
              href={practice.google_review_url ?? undefined}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 mt-1.5 text-[12.5px] font-semibold text-ink"
            >
              <Star size={13} className="text-gold fill-gold" />
              {practice.google_rating.toFixed(1)}
              <span className="text-ink-faint font-normal">
                ({practice.google_rating_count ?? 0} Google reviews)
              </span>
            </a>
          )}
        </div>
      </div>

      {practice.gallery && practice.gallery.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 mb-8">
          {practice.gallery.map((g) => (
            <div key={g.id} className="rounded-xl overflow-hidden border border-line">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={g.photo_url} alt={g.caption ?? ""} className="w-full h-24 object-cover" />
            </div>
          ))}
        </div>
      )}

      <div className="space-y-5 mb-8">
        {practice.culture_text && (
          <div className="rounded-2xl bg-line-soft border-l-4 border-gold p-5">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-faint mb-2">Culture</p>
            <p className="text-[15px] leading-relaxed text-ink">{practice.culture_text}</p>
          </div>
        )}
        {practice.thrive_text && (
          <div className="rounded-2xl bg-teal-tint border-l-4 border-teal p-5">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-teal-deep mb-2">
              What helps someone thrive here
            </p>
            <p className="text-[15px] leading-relaxed text-ink">{practice.thrive_text}</p>
          </div>
        )}
        {practice.ideal_staff_text && (
          <div className="rounded-2xl border border-line p-5">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-faint mb-2">
              Their ideal staff member
            </p>
            <p className="text-[15px] leading-relaxed text-ink">{practice.ideal_staff_text}</p>
          </div>
        )}
        {practice.honest_challenges_text && (
          <div className="rounded-2xl border border-line p-5">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-faint mb-2">
              What&apos;s genuinely hard about this job
            </p>
            <p className="text-[15px] leading-relaxed text-ink">{practice.honest_challenges_text}</p>
          </div>
        )}
      </div>

      {practice.software && practice.software.length > 0 && (
        <div>
          <p className="text-[13px] font-semibold text-ink-soft mb-2.5 flex items-center gap-1.5">
            <Wrench size={13} /> Software used
          </p>
          <div className="flex flex-wrap gap-1.5">
            {practice.software.map((s, i) => (
              <span key={i} className="text-[12.5px] bg-line-soft px-2.5 py-1 rounded-md">
                {s.software_tags.label}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
