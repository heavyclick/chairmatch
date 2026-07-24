import Link from "next/link";
import { MapPin, Clock, DollarSign } from "lucide-react";
import { SiteHeader } from "@/components/marketing/site-header";
import { SiteFooter } from "@/components/marketing/site-footer";
import { createClient } from "@/lib/supabase/server";
import { US_STATES } from "@/lib/constants";

export const metadata = {
  title: "Browse Dental Jobs — Hdenta",
  description: "Dental hygienist, assistant, front desk, and office manager jobs, pulled in from across the web.",
};

const JOB_TYPES = ["Full-time", "Part-time", "Temp / Relief", "Contract"];
const PAGE_SIZE = 20;

function daysAgo(dateStr: string | null): string {
  if (!dateStr) return "";
  const days = Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000);
  if (days <= 0) return "Posted today";
  if (days === 1) return "Posted 1 day ago";
  return `Posted ${days} days ago`;
}

export default async function JobsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | undefined }>;
}) {
  const params = await searchParams;
  const supabase = await createClient();

  // Default to the visitor's own saved state if they're logged in as
  // a candidate -- per the spec, they shouldn't have to change
  // anything to see locally relevant results. Anonymous visitors (the
  // Google-search / SEO case) just see everything by default, since
  // there's no profile to derive a state from.
  let defaultState: string | null = null;
  const { data: authData } = await supabase.auth.getUser();
  if (authData.user) {
    const { data: candidate } = await supabase
      .from("candidate_profiles")
      .select("state")
      .eq("id", authData.user.id)
      .maybeSingle();
    defaultState = candidate?.state ?? null;
  }

  const state = params.state ?? defaultState ?? "";
  const city = params.city ?? "";
  const position = params.position ?? "";
  const jobType = params.job_type ?? "";
  const payMin = params.pay_min ? Number(params.pay_min) : null;
  const source = params.source ?? "";
  const page = Math.max(1, Number(params.page) || 1);

  let query = supabase
    .from("jobs")
    .select("slug, title, practice_name, city, state, job_type, pay_min, pay_max, pay_unit, source_platform, posted_date", {
      count: "exact",
    })
    .eq("status", "active")
    .order("scraped_at", { ascending: false })
    .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);

  if (state && state !== "all") query = query.eq("state", state);
  if (city) query = query.ilike("city", `%${city}%`);
  if (position) query = query.ilike("title", `%${position}%`);
  if (jobType) query = query.eq("job_type", jobType);
  if (payMin) query = query.gte("pay_max", payMin);
  if (source) query = query.eq("source_platform", source);

  const { data: jobs, count } = await query;
  const totalPages = Math.max(1, Math.ceil((count ?? 0) / PAGE_SIZE));

  function buildUrl(overrides: Record<string, string | number | undefined>) {
    const next = new URLSearchParams();
    const merged = { state, city, position, job_type: jobType, pay_min: params.pay_min, source, page: undefined as string | number | undefined, ...overrides };
    for (const [key, value] of Object.entries(merged)) {
      if (value !== undefined && value !== "") next.set(key, String(value));
    }
    return `/jobs?${next.toString()}`;
  }

  return (
    <div>
      <SiteHeader />
      <main className="px-5 md:px-10 py-12 max-w-5xl mx-auto">
        <h1 className="font-serif text-3xl font-semibold mb-2">Browse dental jobs</h1>
        <p className="text-ink-faint text-[14.5px] mb-8">
          Pulled in from across the web, updated daily.
        </p>

        {/* Filters -- plain GET form so this works with zero client JS
            and stays fully server-rendered/crawlable. */}
        <form className="grid grid-cols-2 md:grid-cols-6 gap-3 mb-8 p-4 rounded-2xl border border-line bg-bg-raised">
          <input
            name="position"
            defaultValue={position}
            placeholder="Position (e.g. Hygienist)"
            className="col-span-2 md:col-span-2 px-3 py-2 rounded-control border border-line text-[13.5px]"
          />
          <select name="state" defaultValue={state || "all"} className="px-3 py-2 rounded-control border border-line text-[13.5px]">
            <option value="all">All states</option>
            {US_STATES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          <input
            name="city"
            defaultValue={city}
            placeholder="City"
            className="px-3 py-2 rounded-control border border-line text-[13.5px]"
          />
          <select name="job_type" defaultValue={jobType} className="px-3 py-2 rounded-control border border-line text-[13.5px]">
            <option value="">Any job type</option>
            {JOB_TYPES.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
          <input
            name="pay_min"
            type="number"
            defaultValue={params.pay_min ?? ""}
            placeholder="Min pay"
            className="px-3 py-2 rounded-control border border-line text-[13.5px]"
          />
          <button type="submit" className="col-span-2 md:col-span-6 bg-teal text-white font-semibold text-[13.5px] py-2.5 rounded-control hover:bg-teal-deep transition-colors">
            Filter
          </button>
        </form>

        {(!jobs || jobs.length === 0) && (
          <p className="text-ink-faint text-[14.5px] py-12 text-center">
            No jobs match those filters right now -- try widening your search.
          </p>
        )}

        <div className="space-y-3">
          {jobs?.map((job) => (
            <Link
              key={job.slug}
              href={`/jobs/${job.slug}`}
              className="block rounded-2xl border border-line p-5 hover:border-teal transition-colors"
            >
              <div className="flex items-start justify-between gap-4 mb-2">
                <div>
                  <h2 className="font-serif text-lg font-semibold">{job.title}</h2>
                  <p className="text-[13.5px] text-ink-soft">{job.practice_name ?? "Confidential practice"}</p>
                </div>
                {job.source_platform && (
                  <span className="shrink-0 text-[11px] font-semibold uppercase tracking-wide text-ink-faint bg-bg-raised border border-line px-2 py-1 rounded-full">
                    Via {job.source_platform}
                  </span>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[12.5px] text-ink-faint">
                {(job.city || job.state) && (
                  <span className="flex items-center gap-1"><MapPin size={12} /> {[job.city, job.state].filter(Boolean).join(", ")}</span>
                )}
                {job.job_type && <span>{job.job_type}</span>}
                {(job.pay_min || job.pay_max) && (
                  <span className="flex items-center gap-1">
                    <DollarSign size={12} />
                    {job.pay_min && job.pay_max ? `$${job.pay_min}-$${job.pay_max}` : `$${job.pay_min ?? job.pay_max}`}
                    /{job.pay_unit === "hour" ? "hr" : "yr"}
                  </span>
                )}
                <span className="flex items-center gap-1"><Clock size={12} /> {daysAgo(job.posted_date)}</span>
              </div>
            </Link>
          ))}
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-8">
            {page > 1 && (
              <Link href={buildUrl({ page: page - 1 })} className="text-[13px] font-semibold text-teal-deep">
                Previous
              </Link>
            )}
            <span className="text-[13px] text-ink-faint">Page {page} of {totalPages}</span>
            {page < totalPages && (
              <Link href={buildUrl({ page: page + 1 })} className="text-[13px] font-semibold text-teal-deep">
                Next
              </Link>
            )}
          </div>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}
