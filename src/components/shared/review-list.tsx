"use client";

import { useState } from "react";
import { Star, Flag } from "lucide-react";

export interface ReviewItem {
  id: string;
  reviewer_name: string;
  rating: number;
  review_text: string | null;
  created_at: string;
}

function StarRow({ rating, size = 13 }: { rating: number; size?: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <Star key={n} size={size} className={n <= rating ? "text-gold fill-gold" : "text-line"} />
      ))}
    </div>
  );
}

interface ReviewListProps {
  reviews: ReviewItem[];
  averageRating: number | null;
  /** When true (candidate viewing their own profile), shows a flag
   *  action on each review. Owners browsing a candidate just read --
   *  they have no flagging ability over someone else's reviews. */
  allowFlagging?: boolean;
}

export function ReviewSummaryAndList({ reviews, averageRating, allowFlagging }: ReviewListProps) {
  const [flagging, setFlagging] = useState<string | null>(null);
  const [flaggedIds, setFlaggedIds] = useState<Set<string>>(new Set());

  async function submitFlag(reviewId: string, reason: string) {
    const res = await fetch("/api/reviews/flag", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reviewId, reason }),
    });
    if (res.ok) {
      setFlaggedIds((s) => new Set(s).add(reviewId));
    }
    setFlagging(null);
  }

  return (
    <div>
      <div className="flex items-center gap-2.5 mb-4">
        {averageRating != null ? (
          <>
            <StarRow rating={Math.round(averageRating)} size={15} />
            <span className="text-[14.5px] font-semibold">{averageRating.toFixed(1)}</span>
            <span className="text-[13px] text-ink-faint">({reviews.length} reviews)</span>
          </>
        ) : (
          <span className="text-[13.5px] text-ink-faint">No reviews yet</span>
        )}
      </div>

      <div className="space-y-3">
        {reviews.map((r) => {
          const isFlagged = flaggedIds.has(r.id);
          return (
            <div key={r.id} className="rounded-xl border border-line bg-bg-raised p-4">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[13.5px] font-semibold">{r.reviewer_name}</span>
                <StarRow rating={r.rating} />
              </div>
              {r.review_text && <p className="text-[13.5px] text-ink-soft leading-relaxed mb-2">{r.review_text}</p>}

              {allowFlagging && !isFlagged && flagging !== r.id && (
                <button
                  onClick={() => setFlagging(r.id)}
                  className="flex items-center gap-1 text-[11.5px] text-ink-faint hover:text-coral-deep"
                >
                  <Flag size={11} /> Flag this review
                </button>
              )}
              {allowFlagging && isFlagged && (
                <p className="text-[11.5px] text-teal-deep">Flagged for review.</p>
              )}
              {allowFlagging && flagging === r.id && (
                <FlagReasonInput onSubmit={(reason) => submitFlag(r.id, reason)} onCancel={() => setFlagging(null)} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function FlagReasonInput({ onSubmit, onCancel }: { onSubmit: (reason: string) => void; onCancel: () => void }) {
  const [reason, setReason] = useState("");
  return (
    <div className="mt-2 flex items-center gap-2">
      <input
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        placeholder="Why are you flagging this?"
        className="flex-1 px-2.5 py-1.5 rounded-lg border border-line text-[12px] outline-none focus:border-teal"
      />
      <button
        onClick={() => reason.trim() && onSubmit(reason.trim())}
        className="text-[11.5px] font-semibold text-coral-deep"
      >
        Submit
      </button>
      <button onClick={onCancel} className="text-[11.5px] text-ink-faint">
        Cancel
      </button>
    </div>
  );
}
