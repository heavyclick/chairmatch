"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Star, Loader2 } from "lucide-react";

interface PublicCandidate {
  id: string;
  full_name: string;
  photo_url: string | null;
  city: string | null;
  state: string | null;
  role?: { label: string };
}

interface Review {
  id: string;
  reviewer_name: string;
  rating: number;
  review_text: string | null;
  created_at: string;
}

function StarRow({ rating, size = 14 }: { rating: number; size?: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          size={size}
          className={n <= rating ? "text-gold fill-gold" : "text-line"}
        />
      ))}
    </div>
  );
}

export default function PublicCandidateReviewPage() {
  const params = useParams<{ candidateId: string }>();
  const [candidate, setCandidate] = useState<PublicCandidate | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [averageRating, setAverageRating] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [rating, setRating] = useState(0);
  const [reviewText, setReviewText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    fetch(`/api/reviews/${params.candidateId}`)
      .then(async (res) => {
        if (!res.ok) throw new Error("Couldn't load this profile.");
        return res.json();
      })
      .then((data) => {
        setCandidate(data.candidate);
        setReviews(data.reviews);
        setAverageRating(data.averageRating);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [params.candidateId]);

  async function submitReview(e: React.FormEvent) {
    e.preventDefault();
    if (rating === 0) {
      setSubmitError("Please select a star rating.");
      return;
    }
    setSubmitting(true);
    setSubmitError(null);
    try {
      const res = await fetch("/api/reviews/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          candidateId: params.candidateId,
          reviewerName: name,
          reviewerEmail: email,
          rating,
          reviewText,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Couldn't submit your review.");
      setSubmitted(true);
      setShowForm(false);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-ink-faint">Loading…</div>;
  }

  if (error || !candidate) {
    return (
      <div className="min-h-screen flex items-center justify-center text-center px-5">
        <p className="text-coral-deep">{error || "Profile not found."}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg">
      <div className="max-w-lg mx-auto px-5 py-10">
        <div className="flex items-center gap-2 justify-center mb-8">
          <span className="w-2 h-2 rounded-full bg-coral" />
          <span className="font-serif text-lg font-semibold">ChairMatch</span>
        </div>

        <div className="text-center mb-8">
          <div className="w-20 h-20 rounded-full overflow-hidden bg-gradient-to-br from-teal to-teal-deep flex items-center justify-center mx-auto mb-3">
            {candidate.photo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={candidate.photo_url} alt={candidate.full_name} className="w-full h-full object-cover" />
            ) : (
              <span className="text-white font-serif text-2xl">{candidate.full_name[0]}</span>
            )}
          </div>
          <h1 className="font-serif text-2xl font-bold mb-1">{candidate.full_name}</h1>
          <p className="text-[14px] text-ink-faint mb-2">
            {candidate.role?.label}
            {candidate.city && ` · ${candidate.city}, ${candidate.state}`}
          </p>
          {averageRating != null && (
            <div className="flex items-center justify-center gap-2">
              <StarRow rating={Math.round(averageRating)} />
              <span className="text-[13.5px] font-semibold">{averageRating.toFixed(1)}</span>
              <span className="text-[13px] text-ink-faint">({reviews.length} reviews)</span>
            </div>
          )}
        </div>

        {submitted && (
          <div className="rounded-xl bg-teal-tint border border-teal-tint p-4 mb-6 text-center text-[13.5px] text-teal-deep">
            Thanks! Your review has been posted.
          </div>
        )}

        {!showForm && !submitted && (
          <button
            onClick={() => setShowForm(true)}
            className="w-full bg-teal text-white font-semibold text-[14.5px] py-3 rounded-control hover:bg-teal-deep transition-colors mb-8"
          >
            Leave a review
          </button>
        )}

        {showForm && (
          <form onSubmit={submitReview} className="rounded-2xl border border-line bg-bg-raised p-5 mb-8 space-y-3.5">
            <div>
              <p className="text-[13px] font-semibold text-ink-soft mb-2">Your rating</p>
              <div className="flex gap-1.5">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button key={n} type="button" onClick={() => setRating(n)}>
                    <Star
                      size={26}
                      className={n <= rating ? "text-gold fill-gold" : "text-line"}
                    />
                  </button>
                ))}
              </div>
            </div>
            <input
              placeholder="Your name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full px-4 py-3 rounded-control border border-line bg-bg-raised text-[14px] outline-none focus:border-teal"
            />
            <input
              type="email"
              placeholder="Your email (not shown publicly)"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-3 rounded-control border border-line bg-bg-raised text-[14px] outline-none focus:border-teal"
            />
            <textarea
              placeholder="Tell us about your experience (optional)"
              value={reviewText}
              onChange={(e) => setReviewText(e.target.value)}
              rows={3}
              className="w-full px-4 py-3 rounded-control border border-line bg-bg-raised text-[14px] outline-none focus:border-teal resize-none"
            />
            {submitError && <p className="text-[13px] text-coral-deep">{submitError}</p>}
            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-teal disabled:opacity-60 text-white font-semibold text-[14.5px] py-3 rounded-control hover:bg-teal-deep transition-colors flex items-center justify-center gap-2"
            >
              {submitting && <Loader2 size={15} className="animate-spin" />}
              {submitting ? "Submitting…" : "Submit review"}
            </button>
          </form>
        )}

        <div className="space-y-3.5">
          {reviews.length === 0 && (
            <p className="text-center text-[13.5px] text-ink-faint">No reviews yet.</p>
          )}
          {reviews.map((r) => (
            <div key={r.id} className="rounded-xl border border-line bg-bg-raised p-4">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[13.5px] font-semibold">{r.reviewer_name}</span>
                <StarRow rating={r.rating} size={12} />
              </div>
              {r.review_text && <p className="text-[13.5px] text-ink-soft leading-relaxed">{r.review_text}</p>}
            </div>
          ))}
        </div>

        <p className="text-center text-[12px] text-ink-faint mt-8">
          Looking for someone else?{" "}
          <Link href="/review/search" className="text-teal-deep font-semibold">Search ChairMatch</Link>
        </p>
      </div>
    </div>
  );
}
