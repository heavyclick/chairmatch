import Link from "next/link";
import { redirect } from "next/navigation";
import { MapPin, Clock, DollarSign, ExternalLink } from "lucide-react";
import { SiteHeader } from "@/components/marketing/site-header";
import { SiteFooter } from "@/components/marketing/site-footer";
import { createClient } from "@/lib/supabase/server";

function daysAgo(dateStr: string | null): string {
  if (!dateStr) return "";
  const days = Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000);
  if (days <= 0) return "Posted today";
  if (days === 1) return "Posted 1 day ago";
  return `Posted ${days} days ago`;
}

export default async function JobDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ via?: string }>;
}) {
  const { slug } = await params;
  const { via } = await searchParams;

  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getUser();

  // The ?via=social variant is what the scraper hands to Reddit/Telegram
  // -- unlike the plain URL (what goes in the sitemap for Google), this
  // one hard-redirects to signup BEFORE rendering anything, matching
  // the original spec's "Telegram click -> auth gate -> register ->
  // land on the exact job" flow. The plain URL never does this -- it's
  // fully public so search-engine traffic gets real content to land on,
  // and only the Apply button itself is gated below.
  if (via === "social" && !authData.user) {
    redirect(`/signup?redirect=${encodeURIComponent(`/jobs/${slug}`)}`);
  }

  const { data: job } = await supabase
    .from("jobs")
    .select("*")
    .eq("slug", slug)
    .eq("status", "active")
    .maybeSingle();

  if (!job) {
    return (
      <div>
        <SiteHeader />
        <main className="px-5 md:px-10 py-20 max-w-2xl mx-auto text-center">
          <h1 className="font-serif text-2xl font-semibold mb-3">This job isn&apos;t available anymore</h1>
          <p className="text-ink-faint text-[14.5px] mb-6">It may have expired or been filled.</p>
          <Link href="/jobs" className="text-teal-deep font-semibold text-[14px]">Browse other jobs</Link>
        </main>
        <SiteFooter />
      </div>
    );
  }

  const requirements = (job.requirements as string[] | null) ?? [];
  const benefits = (job.benefits as string[] | null) ?? [];
  const applyHref = `/signup?redirect=${encodeURIComponent(`/jobs/${slug}`)}`;

  return (
    <div>
      <SiteHeader />
      <main className="px-5 md:px-10 py-12 max-w-2xl mx-auto">
        <Link href="/jobs" className="text-[13px] font-semibold text-teal-deep mb-6 inline-block">
          &larr; Back to jobs
        </Link>

        <div className="flex items-start justify-between gap-4 mb-1">
          <h1 className="font-serif text-2xl md:text-3xl font-semibold">{job.title}</h1>
          {job.source_platform && (
            <span className="shrink-0 text-[11px] font-semibold uppercase tracking-wide text-ink-faint bg-bg-raised border border-line px-2 py-1 rounded-full">
              Via {job.source_platform}
            </span>
          )}
        </div>
        <p className="text-[15px] text-ink-soft mb-4">{job.practice_name ?? "Confidential practice"}</p>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[13.5px] text-ink-faint mb-8 pb-8 border-b border-line">
          {(job.city || job.state) && (
            <span className="flex items-center gap-1"><MapPin size={13} /> {[job.city, job.state, job.zip].filter(Boolean).join(", ")}</span>
          )}
          {job.job_type && <span>{job.job_type}</span>}
          {(job.pay_min || job.pay_max) && (
            <span className="flex items-center gap-1">
              <DollarSign size={13} />
              {job.pay_min && job.pay_max ? `$${job.pay_min}-$${job.pay_max}` : `$${job.pay_min ?? job.pay_max}`}
              /{job.pay_unit === "hour" ? "hr" : "yr"}
            </span>
          )}
          <span className="flex items-center gap-1"><Clock size={13} /> {daysAgo(job.posted_date)}</span>
        </div>

        {job.description && (
          <div className="mb-8">
            <h2 className="text-[12px] font-semibold uppercase tracking-wide text-ink-faint mb-2">Description</h2>
            <p className="text-[14.5px] leading-relaxed text-ink whitespace-pre-line">{job.description}</p>
          </div>
        )}

        {requirements.length > 0 && (
          <div className="mb-8">
            <h2 className="text-[12px] font-semibold uppercase tracking-wide text-ink-faint mb-2">Requirements</h2>
            <ul className="list-disc pl-5 space-y-1 text-[14.5px] text-ink">
              {requirements.map((r, i) => <li key={i}>{r}</li>)}
            </ul>
          </div>
        )}

        {benefits.length > 0 && (
          <div className="mb-10">
            <h2 className="text-[12px] font-semibold uppercase tracking-wide text-ink-faint mb-2">Benefits</h2>
            <ul className="list-disc pl-5 space-y-1 text-[14.5px] text-ink">
              {benefits.map((b, i) => <li key={i}>{b}</li>)}
            </ul>
          </div>
        )}

        {authData.user ? (
          <a
            href={job.source_url}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 bg-teal text-white font-semibold text-[15px] px-6 py-3.5 rounded-control hover:bg-teal-deep transition-colors"
          >
            Apply on {job.source_platform ?? "original site"} <ExternalLink size={15} />
          </a>
        ) : (
          <Link
            href={applyHref}
            className="inline-flex items-center gap-2 bg-teal text-white font-semibold text-[15px] px-6 py-3.5 rounded-control hover:bg-teal-deep transition-colors"
          >
            Sign up to apply
          </Link>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}
