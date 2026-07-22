// src/app/(marketing)/jobs/[slug]/page.tsx
//
// Corrected column names:
//   practice_name (not company)
//   city / state (not location_city / location_state)
//   source_url (not apply_url)
//   source_platform (not source)
//   pay_unit (not pay_period)
//   posted_date (not posted_at) — type: date "YYYY-MM-DD"
//   benefits — jsonb

import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import { MapPin, Clock, ExternalLink, ArrowLeft } from "lucide-react";
import type { Metadata } from "next";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const supabase = await createClient();
  const { data: job } = await supabase
    .from("jobs")
    .select("title, practice_name, city, state")
    .eq("slug", slug)
    .single();
  if (!job) return { title: "Job not found — Hdenta" };
  return {
    title: `${job.title} at ${job.practice_name ?? "Dental Practice"} — Hdenta`,
    description: `${job.title} in ${job.city ?? ""}, ${job.state ?? ""}. Browse dental jobs on Hdenta.`,
  };
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
  if (days === 0) return "Posted today";
  if (days === 1) return "Posted yesterday";
  if (days < 7) return `Posted ${days} days ago`;
  if (days < 30) return `Posted ${Math.floor(days / 7)} weeks ago`;
  return null; // don't show stale dates at all
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
  if (!platform) return "the job board";
  return map[platform.toLowerCase()] ?? platform.charAt(0).toUpperCase() + platform.slice(1);
}

// Renders plain-text description with paragraph + line breaks.
// Handles \n\n (paragraph breaks) and \n (line breaks within paragraph).
// Null-safe.
function DescriptionBlock({ text }: { text: string | null }) {
  if (!text?.trim()) return null;
  const paragraphs = text.split(/\n\n+/);
  return (
    <div className="flex flex-col gap-4">
      {paragraphs.map((para, i) => {
        const lines = para.split("\n");
        return (
          <p key={i} className="text-[14px] text-ink-soft leading-7">
            {lines.map((line, j) => (
              <span key={j}>
                {line}
                {j < lines.length - 1 && <br />}
              </span>
            ))}
          </p>
        );
      })}
    </div>
  );
}

// benefits is jsonb — handle both array and object shapes
function parseBenefits(raw: unknown): string[] {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw.filter((b) => typeof b === "string");
  if (typeof raw === "object" && raw !== null && "items" in raw) {
    const items = (raw as { items: unknown }).items;
    if (Array.isArray(items)) return items.filter((b) => typeof b === "string");
  }
  return [];
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default async function PublicJobDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = await createClient();

  const { data: job } = await supabase
    .from("jobs")
    .select("*")
    .eq("slug", slug)
    .single();

  if (!job) notFound();

  const pay = formatPay(job.pay_min, job.pay_max, job.pay_unit);
  const posted = timeAgo(job.posted_date);          // posted_date, not posted_at
  const isInternal = job.source_type === "internal";
  const benefits = parseBenefits(job.benefits);

  // description_clean takes priority; fall back to raw description
  const descriptionText: string | null =
    job.description_clean?.trim() || job.description?.trim() || null;

  return (
    <div className="min-h-screen bg-bg">
      <div className="max-w-[720px] mx-auto px-5 py-10 pb-20">

        {/* Back */}
        <Link
          href="/jobs"
          className="inline-flex items-center gap-1.5 text-[13px] text-ink-soft hover:text-ink transition-colors mb-7"
        >
          <ArrowLeft size={13} />
          Back to jobs
        </Link>

        {/* Header card */}
        <div
          className={
            isInternal
              ? "bg-white rounded-2xl p-7 mb-4 border-[1.5px] border-teal/30"
              : "bg-white rounded-2xl p-7 mb-4 border border-line"
          }
        >
          {/* Source badge */}
          <div className="mb-4">
            {isInternal ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold uppercase tracking-wider bg-teal/10 text-teal border border-teal/20">
                <span className="w-1.5 h-1.5 rounded-full bg-teal" />
                Posted on Hdenta
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium uppercase tracking-wider bg-bg-raised text-ink-muted border border-line">
                Via {sourceName(job.source_platform)}
              </span>
            )}
          </div>

          {/* Title */}
          <h1 className="font-serif font-bold text-[24px] text-ink leading-snug mb-1.5">
            {job.title}
          </h1>

          {/* practice_name — null-guarded */}
          {job.practice_name && (
            <p className="text-[15px] text-ink-soft font-medium mb-5">
              {job.practice_name}
            </p>
          )}

          {/* Meta */}
          <div className="flex flex-wrap items-center gap-3">
            {(job.city || job.state) && (
              <span className="inline-flex items-center gap-1 text-[13px] text-ink-soft">
                <MapPin size={12} className="shrink-0" />
                {[job.city, job.state].filter(Boolean).join(", ")}
              </span>
            )}

            {job.job_type && (
              <span className="px-2.5 py-0.5 rounded text-[12px] font-medium bg-bg-raised text-ink-soft capitalize">
                {job.job_type}
              </span>
            )}

            {/* NULL GUARD — clock only renders if posted_date actually has a value */}
            {posted && (
              <span className="inline-flex items-center gap-1 text-[12px] text-ink-muted">
                <Clock size={11} className="shrink-0" />
                {posted}
              </span>
            )}
          </div>

          {/* Pay — only renders if pay data exists */}
          {pay && (
            <div className="mt-5 pt-5 border-t border-line">
              <p className="font-serif font-bold text-[22px] text-teal">{pay}</p>
            </div>
          )}

          {/* Benefits chips — only renders if benefits array has items */}
          {benefits.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-4">
              {benefits.map((b: string) => (
                <span
                  key={b}
                  className="px-3 py-1 rounded-full text-[12px] font-medium bg-teal/8 text-teal"
                >
                  🔗 {b}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Description card — only renders if we have text */}
        {descriptionText && (
          <div className="bg-white rounded-2xl p-7 mb-4 border border-line">
            <p className="text-[11px] font-semibold text-ink-muted uppercase tracking-widest mb-4">
              Description
            </p>
            <DescriptionBlock text={descriptionText} />
          </div>
        )}

        {/* Requirements card — jsonb, only if populated */}
        {job.requirements && Object.keys(job.requirements).length > 0 && (
          <div className="bg-white rounded-2xl p-7 mb-4 border border-line">
            <p className="text-[11px] font-semibold text-ink-muted uppercase tracking-widest mb-4">
              Requirements
            </p>
            {Array.isArray(job.requirements) ? (
              <ul className="flex flex-col gap-2">
                {(job.requirements as string[]).map((req, i) => (
                  <li key={i} className="flex items-start gap-2 text-[14px] text-ink-soft">
                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-teal shrink-0" />
                    {req}
                  </li>
                ))}
              </ul>
            ) : (
              <DescriptionBlock
                text={
                  typeof job.requirements === "string"
                    ? job.requirements
                    : JSON.stringify(job.requirements, null, 2)
                }
              />
            )}
          </div>
        )}

        {/* Apply CTA */}
        <div
          className={`rounded-2xl p-6 flex items-center justify-between flex-wrap gap-4 ${
            isInternal ? "bg-teal" : "bg-ink"
          }`}
        >
          <div>
            <p className="text-[15px] font-semibold text-white mb-1">
              Interested in this role?
            </p>
            <p className="text-[13px] text-white/60">
              {isInternal
                ? "Apply directly on Hdenta."
                : `You'll be taken to ${sourceName(job.source_platform)} to complete your application.`}
            </p>
          </div>
          <a
            href={job.source_url}
            target="_blank"
            rel="noopener noreferrer"
            className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-[13px] font-semibold hover:opacity-90 transition-opacity shrink-0 ${
              isInternal ? "bg-white text-teal" : "bg-teal text-white"
            }`}
          >
            {isInternal
              ? "Apply now"
              : `Apply on ${sourceName(job.source_platform)}`}
            <ExternalLink size={12} />
          </a>
        </div>

        {/* Upsell strip for unauthed visitors */}
        <div className="mt-4 p-4 rounded-xl bg-teal/6 border border-teal/15 flex items-center justify-between flex-wrap gap-3">
          <div>
            <p className="text-[13px] font-semibold text-teal mb-0.5">
              Want practices to find you?
            </p>
            <p className="text-[12px] text-ink-soft">
              Create a free Hdenta profile — built around fit, not just credentials.
            </p>
          </div>
          <Link
            href="/signup"
            className="px-4 py-2 rounded-lg bg-teal text-white text-[12px] font-semibold hover:bg-teal/90 transition-colors shrink-0"
          >
            Create profile →
          </Link>
        </div>

      </div>
    </div>
  );
}
