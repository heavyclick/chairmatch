"use client";

// src/components/candidate/apply-interstitial.tsx

import { useEffect, useRef, useState } from "react";
import { ExternalLink, X, Copy, Check, Send, Loader2 } from "lucide-react";
import type { Job } from "./job-card";

interface ApplyInterstitialProps {
  job: Job | null;
  profileSummary: string | null;
  candidateId: string | null;
  onClose: () => void;
}

function sourceName(platform: string | null): string {
  const map: Record<string, string> = {
    glassdoor:    "Glassdoor",
    simplyhired:  "SimplyHired",
    linkedin:     "LinkedIn",
    indeed:       "Indeed",
    ziprecruiter: "ZipRecruiter",
  };
  if (!platform) return "the job board";
  return map[platform.toLowerCase()] ?? platform.charAt(0).toUpperCase() + platform.slice(1);
}

export function ApplyInterstitial({
  job,
  profileSummary,
  candidateId,
  onClose,
}: ApplyInterstitialProps) {
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!job) return;
    const handleKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [job, onClose]);

  if (!job) return null;

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/60 backdrop-blur-sm"
      onClick={(e) => { if (e.target === overlayRef.current) onClose(); }}
    >
      {job.source_type === "internal" ? (
        <NativeApplySheet job={job} candidateId={candidateId} onClose={onClose} />
      ) : (
        <ExternalApplySheet job={job} profileSummary={profileSummary} onClose={onClose} />
      )}
    </div>
  );
}

// ── Native apply sheet — in-platform application ──────────────────────────────
function NativeApplySheet({
  job,
  candidateId,
  onClose,
}: {
  job: Job;
  candidateId: string | null;
  onClose: () => void;
}) {
  const [coverNote, setCoverNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [threadId, setThreadId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Extra fields only present on native job_postings rows, passed
  // through from the server component via the Job interface extension.
  const notAFitIf = (job as Job & { not_a_fit_if?: string }).not_a_fit_if;
  const requirements = (job as Job & { requirements?: string[] }).requirements ?? [];

  if (!candidateId) {
    // Shouldn't happen (page guards auth), but just in case.
    return (
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 text-center">
        <p className="text-sm text-ink-soft mb-3">Sign in to apply on Hdenta.</p>
        <a href="/login" className="text-teal font-semibold text-[13px] hover:underline">Sign in →</a>
      </div>
    );
  }

  async function handleSubmit() {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/jobs/${job.slug}/apply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cover_note: coverNote }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to submit. Please try again.");
        return;
      }
      setThreadId(data.thread_id ?? null);
      setSubmitted(true);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  // ── Confirmation state ──────────────────────────────────────────────────
  if (submitted) {
    return (
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="p-6 text-center">
          <div className="w-12 h-12 rounded-full bg-teal/10 flex items-center justify-center mx-auto mb-4">
            <Check size={22} className="text-teal" />
          </div>
          <h2 className="font-serif font-bold text-[18px] mb-2">Application sent!</h2>
          <p className="text-sm text-ink-soft mb-5 leading-relaxed">
            {job.practice_name
              ? `${job.practice_name} will see your application in their inbox.`
              : "The practice will see your application in their inbox."}
          </p>
          <div className="flex flex-col gap-2.5">
            {threadId && (
              <a
                href="/candidate/messages"
                className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-teal text-white text-[13px] font-semibold hover:bg-teal/90 transition-colors"
              >
                View your message thread →
              </a>
            )}
            <button
              onClick={onClose}
              className="w-full py-2.5 rounded-xl border border-line text-[13px] font-medium text-ink-soft hover:bg-bg-raised transition-colors"
            >
              Back to jobs
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Apply form ─────────────────────────────────────────────────────────────
  return (
    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden max-h-[90vh] flex flex-col">
      {/* Header */}
      <div className="flex items-start justify-between p-5 pb-4">
        <div>
          <p className="text-xs font-semibold text-ink-muted uppercase tracking-wider mb-1">
            Apply on Hdenta
          </p>
          <h2 className="font-serif font-bold text-[17px] text-ink leading-snug">{job.title}</h2>
          {job.practice_name && (
            <p className="text-sm text-ink-soft mt-0.5">{job.practice_name}</p>
          )}
        </div>
        <button
          onClick={onClose}
          className="w-7 h-7 rounded-full flex items-center justify-center text-ink-muted hover:bg-bg-raised transition-colors shrink-0 mt-0.5"
        >
          <X size={14} />
        </button>
      </div>

      <div className="px-5 pb-5 flex flex-col gap-3 overflow-y-auto">
        {/* "Not a fit if" block — show before they apply so they can
            self-select out rather than wasting both parties' time. */}
        {notAFitIf && (
          <div className="border-l-[3px] border-amber-400/70 pl-3 py-1 bg-amber-50/60 rounded-r-lg">
            <p className="text-[10.5px] font-semibold text-amber-700 uppercase tracking-wider mb-1">
              This role isn't a fit if…
            </p>
            <p className="text-[13px] text-amber-900 leading-relaxed italic">{notAFitIf}</p>
          </div>
        )}

        {/* Quick requirements summary */}
        {requirements.length > 0 && (
          <div className="border border-line rounded-xl p-3.5 bg-bg-raised">
            <p className="text-[10.5px] font-semibold text-ink-muted uppercase tracking-wider mb-2">
              Requirements
            </p>
            <ul className="list-disc list-inside space-y-1">
              {requirements.slice(0, 4).map((r) => (
                <li key={r} className="text-[13px] text-ink-soft">{r}</li>
              ))}
              {requirements.length > 4 && (
                <li className="text-[12px] text-ink-muted">+{requirements.length - 4} more</li>
              )}
            </ul>
          </div>
        )}

        {/* Cover note */}
        <div>
          <label className="text-[11px] font-semibold text-ink-soft uppercase tracking-wider block mb-1.5">
            Anything you'd like them to know? <span className="font-normal normal-case">(optional)</span>
          </label>
          <textarea
            value={coverNote}
            onChange={(e) => setCoverNote(e.target.value)}
            placeholder="e.g. I'm available to start in two weeks, and I have experience with the software you use…"
            rows={3}
            className="w-full px-3 py-2.5 rounded-xl border border-line text-[13.5px] resize-none focus:outline-none focus:border-teal transition-colors"
          />
        </div>

        {error && (
          <p className="text-[13px] text-coral font-medium">{error}</p>
        )}

        <button
          onClick={handleSubmit}
          disabled={submitting}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-teal text-white text-[13px] font-semibold hover:bg-teal/90 transition-colors disabled:opacity-60"
        >
          {submitting ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
          {submitting ? "Submitting…" : "Submit application"}
        </button>

        <p className="text-center text-[11px] text-ink-muted">
          Your Hdenta profile will be shared with the practice.
        </p>
      </div>
    </div>
  );
}

// ── External apply sheet — copy summary + redirect ────────────────────────────
// Unchanged from the original ApplyInterstitial logic.
function ExternalApplySheet({
  job,
  profileSummary,
  onClose,
}: {
  job: Job;
  profileSummary: string | null;
  onClose: () => void;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (!profileSummary) return;
    await navigator.clipboard.writeText(profileSummary);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleProceed = () => {
    window.open(job.source_url, "_blank", "noopener,noreferrer");
    onClose();
  };

  return (
    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
      <div className="flex items-start justify-between p-5 pb-4">
        <div>
          <p className="text-xs font-semibold text-ink-muted uppercase tracking-wider mb-1">
            Before you go
          </p>
          <h2 className="font-serif font-bold text-[17px] text-ink leading-snug">{job.title}</h2>
          {job.practice_name && (
            <p className="text-sm text-ink-soft mt-0.5">{job.practice_name}</p>
          )}
        </div>
        <button
          onClick={onClose}
          className="w-7 h-7 rounded-full flex items-center justify-center text-ink-muted hover:bg-bg-raised transition-colors shrink-0 mt-0.5"
        >
          <X size={14} />
        </button>
      </div>

      <div className="px-5 pb-5 flex flex-col gap-3">
        {profileSummary ? (
          <div className="border border-line rounded-xl p-4 bg-bg-raised">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold text-ink-soft uppercase tracking-wider">
                Your Hdenta profile summary
              </p>
              <button
                onClick={handleCopy}
                className="inline-flex items-center gap-1 text-[11px] font-medium text-teal hover:text-teal/80 transition-colors"
              >
                {copied ? <><Check size={11} /> Copied</> : <><Copy size={11} /> Copy</>}
              </button>
            </div>
            <p className="text-sm text-ink leading-relaxed line-clamp-4">{profileSummary}</p>
            <p className="text-[11px] text-ink-muted mt-2">
              Paste this in the application's "About you" or cover note field.
            </p>
          </div>
        ) : (
          <div className="border border-dashed border-line rounded-xl p-4 text-center">
            <p className="text-sm text-ink-soft mb-1">
              Complete your Hdenta profile to get a quick-copy cover summary for every application.
            </p>
            <a href="/candidate/profile" className="text-[13px] font-semibold text-teal hover:underline">
              Complete profile →
            </a>
          </div>
        )}

        <button
          onClick={handleProceed}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-ink text-white text-[13px] font-semibold hover:bg-ink/90 transition-colors"
        >
          Open on {sourceName(job.source_platform)}
          <ExternalLink size={13} />
        </button>

        <p className="text-center text-[11px] text-ink-muted">
          You're leaving Hdenta. Your session stays active when you return.
        </p>
      </div>
    </div>
  );
}
