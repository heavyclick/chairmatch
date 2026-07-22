"use client";

// src/components/candidate/job-card.tsx

import { MapPin, Clock, ExternalLink, Briefcase } from "lucide-react";
import { cn } from "@/lib/utils";

export interface Job {
  id: string;
  slug: string;
  title: string;
  practice_name: string | null;   // DB column name
  city: string | null;
  state: string | null;
  job_type: string | null;
  pay_min: number | null;
  pay_max: number | null;
  pay_unit: string | null;        // DB column name (was pay_period)
  description: string | null;
  description_clean: string | null;
  source_url: string;             // DB column name (was apply_url)
  source_platform: string | null; // DB column name (was source)
  source_type: "internal" | "external";
  role_category: string | null;
  benefits: string[] | Record<string, unknown> | null;  // jsonb — flexible
  posted_date: string | null;     // DB column name, type: date "YYYY-MM-DD"
  status: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatPay(min: number | null, max: number | null, unit: string | null): string | null {
  if (!min && !max) return null;
  const fmt = (n: number) =>
    unit === "annual" ? `$${(n / 1000).toFixed(0)}k` : `$${n.toFixed(0)}`;
  const label = unit === "annual" ? "/yr" : unit === "monthly" ? "/mo" : "/hr";
  if (min && max) return `${fmt(min)}–${fmt(max)}${label}`;
  if (min) return `${fmt(min)}+${label}`;
  return `Up to ${fmt(max!)}${label}`;
}

function timeAgo(dateStr: string | null): string | null {
  if (!dateStr) return null;
  const days = Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000);
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  return null;
}

function previewText(job: Job): string {
  const text = job.description_clean ?? job.description ?? "";
  if (!text) return "";
  const first = text.split(/\n\n/)[0].replace(/\n/g, " ").trim();
  return first.length > 150 ? first.slice(0, 150).trimEnd() + "…" : first;
}

function sourceName(platform: string | null): string {
  const map: Record<string, string> = {
    glassdoor: "Glassdoor",
    simplyhired: "SimplyHired",
    linkedin: "LinkedIn",
    indeed: "Indeed",
    ziprecruiter: "ZipRecruiter",
    hdenta: "Hdenta",
  };
  if (!platform) return "External";
  return map[platform.toLowerCase()] ?? platform.charAt(0).toUpperCase() + platform.slice(1);
}

// benefits is jsonb — could be string[], {items: string[]}, or null
function parseBenefits(raw: Job["benefits"]): string[] {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw.filter((b) => typeof b === "string") as string[];
  if (typeof raw === "object" && "items" in raw && Array.isArray((raw as any).items))
    return (raw as any).items;
  return [];
}

// ─── Component ────────────────────────────────────────────────────────────────

interface JobCardProps {
  job: Job;
  onApply?: (job: Job) => void;
}

export function JobCard({ job, onApply }: JobCardProps) {
  const pay = formatPay(job.pay_min, job.pay_max, job.pay_unit);
  const posted = timeAgo(job.posted_date);
  const preview = previewText(job);
  const benefits = parseBenefits(job.benefits);
  const isInternal = job.source_type === "internal";

  const handleApply = () => {
    if (onApply) {
      onApply(job);
    } else {
      window.open(job.source_url, "_blank", "noopener,noreferrer");
    }
  };

  return (
    <div
      className={cn(
        "bg-white rounded-xl p-5 flex flex-col gap-3 transition-shadow hover:shadow-md",
        isInternal
          ? "border-[1.5px] border-teal/30 shadow-[0_0_0_3px_rgba(45,112,95,0.06)]"
          : "border border-line"
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          <div
            className={cn(
              "w-8 h-8 rounded-lg flex items-center justify-center shrink-0",
              isInternal ? "bg-teal/10" : "bg-bg-raised"
            )}
          >
            <Briefcase size={14} className={isInternal ? "text-teal" : "text-ink-soft"} />
          </div>
          <div className="min-w-0">
            <h3 className="font-serif font-semibold text-[15px] text-ink leading-snug truncate">
              {job.title}
            </h3>
            {job.practice_name && (
              <p className="text-sm text-ink-soft font-medium mt-0.5 truncate">
                {job.practice_name}
              </p>
            )}
          </div>
        </div>

        {/* Source badge */}
        {isInternal ? (
          <span className="shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold tracking-wider uppercase bg-teal/10 text-teal border border-teal/20">
            <span className="w-1.5 h-1.5 rounded-full bg-teal" />
            On Hdenta
          </span>
        ) : (
          <span className="shrink-0 px-2 py-0.5 rounded-full text-[10px] font-medium tracking-wider uppercase bg-bg-raised text-ink-muted border border-line">
            Via {sourceName(job.source_platform)}
          </span>
        )}
      </div>

      {/* Meta row */}
      <div className="flex flex-wrap items-center gap-2.5">
        {(job.city || job.state) && (
          <span className="inline-flex items-center gap-1 text-xs text-ink-soft">
            <MapPin size={11} className="shrink-0" />
            {[job.city, job.state].filter(Boolean).join(", ")}
          </span>
        )}
        {job.job_type && (
          <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-bg-raised text-ink-soft capitalize">
            {job.job_type}
          </span>
        )}
        {posted && (
          <span className="inline-flex items-center gap-1 text-[11px] text-ink-muted">
            <Clock size={10} className="shrink-0" />
            {posted}
          </span>
        )}
      </div>

      {/* Pay */}
      {pay && (
        <p className="font-serif font-bold text-[17px] text-teal">{pay}</p>
      )}

      {/* Benefits chips */}
      {benefits.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {benefits.slice(0, 4).map((b) => (
            <span
              key={b}
              className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-teal/8 text-teal"
            >
              🔗 {b}
            </span>
          ))}
          {benefits.length > 4 && (
            <span className="px-2.5 py-0.5 rounded-full text-[11px] text-ink-muted bg-bg-raised">
              +{benefits.length - 4} more
            </span>
          )}
        </div>
      )}

      {/* Description pull-quote */}
      {preview && (
        <div className="border-l-[3px] border-amber-400/60 bg-amber-50/50 rounded-r-md px-3 py-2.5">
          <p className="text-sm text-ink-soft italic leading-relaxed">"{preview}"</p>
        </div>
      )}

      {/* CTA */}
      <button
        onClick={handleApply}
        className={cn(
          "w-full flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-[13px] font-semibold transition-colors",
          isInternal
            ? "bg-teal text-white hover:bg-teal/90"
            : "bg-ink text-white hover:bg-ink/90"
        )}
      >
        {isInternal ? "Apply on Hdenta" : "View & Apply"}
        <ExternalLink size={12} />
      </button>
    </div>
  );
}
