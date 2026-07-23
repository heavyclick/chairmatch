"use client";

// src/app/candidate/browse/browse-jobs-client.tsx

import { useState, useTransition, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { JobCard, type Job } from "@/components/candidate/job-card";
import { ApplyInterstitial } from "@/components/candidate/apply-interstitial";

// Must match roles.slug values from 0001_initial_schema.sql exactly
const ROLE_OPTIONS = [
  { value: "hygienist",               label: "Dental Hygienist" },
  { value: "dental_assistant",        label: "Dental Assistant" },
  { value: "front_desk",              label: "Front Desk" },
  { value: "office_manager",          label: "Office Manager" },
  { value: "treatment_coordinator",   label: "Treatment Coordinator" },
  { value: "billing_coordinator",     label: "Billing Coordinator" },
  { value: "sterilization_tech",      label: "Sterilization Tech" },
  { value: "lab_tech",                label: "Lab Tech" },
  { value: "associate_dentist",       label: "Associate Dentist" },
  { value: "dentist_owner",           label: "Dentist / Practice Owner" },
];

const US_STATES = [
  "AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA",
  "HI","ID","IL","IN","IA","KS","KY","LA","ME","MD",
  "MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ",
  "NM","NY","NC","ND","OH","OK","OR","PA","RI","SC",
  "SD","TN","TX","UT","VT","VA","WA","WV","WI","WY",
];

interface Props {
  initialJobs: Job[];
  internalCount: number;
  currentParams: {
    state?: string;
    city?: string;
    job_type?: string;
    pay_min?: string;
    role?: string;
    source_type?: string;
  };
  profileSummary: string | null;
}

export function BrowseJobsClient({ initialJobs, internalCount, currentParams, profileSummary }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [state, setState]     = useState(currentParams.state ?? "");
  const [city, setCity]       = useState(currentParams.city ?? "");
  const [jobType, setJobType] = useState(currentParams.job_type ?? "");
  const [payMin, setPayMin]   = useState(currentParams.pay_min ?? "");
  const [role, setRole]       = useState(currentParams.role ?? "");
  const activeSourceTab       = currentParams.source_type ?? "all";

  const [interstitialJob, setInterstitialJob] = useState<Job | null>(null);

  const buildParams = useCallback((overrides: Record<string, string> = {}) => {
    const p = new URLSearchParams();
    const vals: Record<string, string> = {
      state, city, job_type: jobType, pay_min: payMin, role,
      source_type: currentParams.source_type ?? "",
      ...overrides,
    };
    Object.entries(vals).forEach(([k, v]) => { if (v) p.set(k, v); });
    return p.toString();
  }, [state, city, jobType, payMin, role, currentParams.source_type]);

  const applyFilters = () => {
    startTransition(() => router.push(`/candidate/browse?${buildParams()}`));
  };

  const setSourceTab = (val: string) => {
    startTransition(() =>
      router.push(`/candidate/browse?${buildParams({ source_type: val === "all" ? "" : val })}`)
    );
  };

  const clearAll = () => {
    setState(""); setCity(""); setJobType(""); setPayMin(""); setRole("");
    startTransition(() => router.push("/candidate/browse"));
  };

  const hasFilters = state || city || jobType || payMin || role || currentParams.source_type;

  return (
    <>
      <ApplyInterstitial
        job={interstitialJob}
        profileSummary={profileSummary}
        onClose={() => setInterstitialJob(null)}
      />

      <div className="px-8 py-8 w-full">
        {/* Page header */}
        <div className="mb-7">
          <p className="text-[11px] font-semibold text-ink-muted uppercase tracking-widest mb-1">
            Find your next role
          </p>
          <h1 className="font-serif font-bold text-[26px] text-ink">Browse dental jobs</h1>
        </div>

        {/* Live-count hero — mirrors owner/browse stat card */}
        <div className="bg-ink rounded-xl p-6 mb-5 flex items-center justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_6px_#34d399]" />
              <span className="text-[11px] font-semibold text-teal/80 uppercase tracking-widest">
                Dental jobs · updated daily
              </span>
            </div>
            <div className="flex items-baseline gap-3">
              <span className="font-serif font-bold text-[40px] text-white leading-none">
                {initialJobs.length}
              </span>
              <span className="text-sm text-white/50">
                {isPending ? "loading…" : "jobs matched"}
                {internalCount > 0 && !isPending && (
                  <> · <span className="text-emerald-400 font-semibold">{internalCount} on Hdenta</span></>
                )}
              </span>
            </div>
          </div>
          {hasFilters && (
            <button
              onClick={clearAll}
              className="text-[12px] font-medium text-white/60 hover:text-white border border-white/15 hover:border-white/30 rounded-lg px-3 py-2 transition-colors"
            >
              Clear filters
            </button>
          )}
        </div>

        {/* Source type quick-tabs */}
        <div className="flex items-center gap-2 mb-4 flex-wrap">
          {[
            { value: "all",      label: "All jobs" },
            { value: "internal", label: "✦ On Hdenta" },
            { value: "external", label: "Aggregated" },
          ].map((tab) => (
            <button
              key={tab.value}
              onClick={() => setSourceTab(tab.value)}
              className={
                activeSourceTab === tab.value
                  ? "px-4 py-1.5 rounded-full text-[13px] font-semibold bg-ink text-white border border-ink"
                  : "px-4 py-1.5 rounded-full text-[13px] font-medium bg-white text-ink-soft border border-line hover:border-ink/30 transition-colors"
              }
            >
              {tab.label}
            </button>
          ))}
          <span className="ml-auto text-[12px] text-ink-muted">
            {isPending ? "Loading…" : `${initialJobs.length} results`}
          </span>
        </div>

        {/* Filter bar */}
        <div className="bg-bg-raised border border-line rounded-xl p-4 mb-6 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
          <select
            value={state}
            onChange={(e) => setState(e.target.value)}
            className="h-9 px-3 rounded-lg border border-line bg-white text-[13px] text-ink"
          >
            <option value="">All states</option>
            {US_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>

          <input
            type="text"
            placeholder="City"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && applyFilters()}
            className="h-9 px-3 rounded-lg border border-line bg-white text-[13px] text-ink"
          />

          <select
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className="h-9 px-3 rounded-lg border border-line bg-white text-[13px] text-ink"
          >
            <option value="">Any role</option>
            {ROLE_OPTIONS.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
          </select>

          <select
            value={jobType}
            onChange={(e) => setJobType(e.target.value)}
            className="h-9 px-3 rounded-lg border border-line bg-white text-[13px] text-ink"
          >
            <option value="">Any type</option>
            <option value="full-time">Full-time</option>
            <option value="part-time">Part-time</option>
            <option value="temp">Temp</option>
            <option value="per-diem">Per diem</option>
          </select>

          <input
            type="number"
            placeholder="Min pay ($/hr)"
            value={payMin}
            onChange={(e) => setPayMin(e.target.value)}
            className="h-9 px-3 rounded-lg border border-line bg-white text-[13px] text-ink"
          />

          <button
            onClick={applyFilters}
            disabled={isPending}
            className="h-9 flex items-center justify-center gap-1.5 rounded-lg bg-teal text-white text-[13px] font-semibold hover:bg-teal/90 transition-colors disabled:opacity-60"
          >
            <Search size={13} />
            {isPending ? "Searching…" : "Search"}
          </button>
        </div>

        {/* Job grid */}
        {initialJobs.length === 0 ? (
          <div className="text-center py-20 text-ink-soft">
            <p className="text-[15px] mb-2">No jobs match those filters right now.</p>
            {hasFilters && (
              <button onClick={clearAll} className="text-[13px] font-semibold text-teal hover:underline">
                Clear all filters
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {initialJobs.map((job) => (
              <JobCard key={job.id} job={job} onApply={setInterstitialJob} />
            ))}
          </div>
        )}
      </div>
    </>
  );
}
