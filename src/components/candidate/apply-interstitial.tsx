"use client";

// src/components/candidate/apply-interstitial.tsx

import { useEffect, useRef, useState } from "react";
import { ExternalLink, X, Copy, Check } from "lucide-react";
import type { Job } from "./job-card";

interface ApplyInterstitialProps {
  job: Job | null;
  profileSummary: string | null;
  onClose: () => void;
}

function sourceName(platform: string | null): string {
  const map: Record<string, string> = {
    glassdoor: "Glassdoor",
    simplyhired: "SimplyHired",
    linkedin: "LinkedIn",
    indeed: "Indeed",
    ziprecruiter: "ZipRecruiter",
  };
  if (!platform) return "the job board";
  return map[platform.toLowerCase()] ?? platform.charAt(0).toUpperCase() + platform.slice(1);
}

export function ApplyInterstitial({ job, profileSummary, onClose }: ApplyInterstitialProps) {
  const [copied, setCopied] = useState(false);
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!job) return;
    const handleKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [job, onClose]);

  if (!job) return null;

  const handleCopy = async () => {
    if (!profileSummary) return;
    await navigator.clipboard.writeText(profileSummary);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleProceed = () => {
    window.open(job.source_url, "_blank", "noopener,noreferrer");  // source_url, not apply_url
    onClose();
  };

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/60 backdrop-blur-sm"
      onClick={(e) => { if (e.target === overlayRef.current) onClose(); }}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="flex items-start justify-between p-5 pb-4">
          <div>
            <p className="text-xs font-semibold text-ink-muted uppercase tracking-wider mb-1">
              Before you go
            </p>
            <h2 className="font-serif font-bold text-[17px] text-ink leading-snug">
              {job.title}
            </h2>
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
    </div>
  );
}
