"use client";

import { useEffect, useState } from "react";
import { SlidersHorizontal, Search, Bell } from "lucide-react";
import { CandidateCard } from "@/components/owner/candidate-card";
import { LiveStatHero } from "@/components/owner/live-stat-hero";
import { FilterSheet, DEFAULT_FILTERS, activeFilterCount, type BrowseFilters } from "@/components/owner/filter-sheet";
import type { CandidateProfile, BlurredCandidateProfile, EmploymentType } from "@/types/database";

const TABS: { slug: EmploymentType; label: string }[] = [
  { slug: "full_time", label: "Full-Time" },
  { slug: "part_time", label: "Part-Time" },
  { slug: "temp", label: "Temp" },
];

export default function BrowsePage() {
  const [tab, setTab] = useState<EmploymentType>("full_time");
  const [filters, setFilters] = useState<BrowseFilters>(DEFAULT_FILTERS);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [results, setResults] = useState<(CandidateProfile | BlurredCandidateProfile)[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [location, setLocation] = useState({ city: "your area", radiusMiles: 15 });
  const [alertRegistered, setAlertRegistered] = useState(false);

  // Fetch the practice's REAL saved location on mount, rather than the
  // hardcoded "Houston, TX" this page used to show -- that was a real
  // bug where this page and the dashboard disagreed about the practice's
  // own location, because this page never read it from the database at all.
  useEffect(() => {
    fetch("/api/owner/profile-summary")
      .then((res) => res.json())
      .then((data) => {
        if (data.city) {
          setLocation({ city: data.city, radiusMiles: data.radiusMiles ?? 15 });
          setFilters((f) => ({ ...f, distanceMiles: String(data.radiusMiles ?? 15) }));
        }
      })
      .catch(() => {
        // Non-fatal -- browse still works with the default placeholder
        // location, just without a personalized starting point.
      });
  }, []);

  async function handleLocationChange(city: string, radiusMiles: number) {
    setLocation({ city, radiusMiles });
    setFilters((f) => ({ ...f, distanceMiles: String(radiusMiles) }));
    await fetch("/api/owner/location", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ city, radiusMiles }),
    });
  }

  useEffect(() => {
    let ignore = false;

    async function run() {
      setLoading(true);
      setError(null);
      setAlertRegistered(false);
      try {
        const params = new URLSearchParams();
        params.set("employment_type", tab);
        if (filters.roleSlugs[0]) params.set("role", filters.roleSlugs[0]);
        if (filters.city) params.set("city", filters.city);
        if (filters.state) params.set("state", filters.state);
        if (filters.zip) params.set("zip", filters.zip);
        if (filters.payMin) params.set("pay_min", filters.payMin);
        if (filters.payMax) params.set("pay_max", filters.payMax);
        if (filters.minYearsExperience) params.set("min_years_experience", filters.minYearsExperience);
        if (filters.openToRelocationOnly) params.set("open_to_relocation", "true");
        if (filters.openToRemoteOnly) params.set("remote_only", "true");
        if (filters.softwareSlugs.length || filters.customSoftware.length) {
          // Custom software entries are matched by their generated slug
          // (lowercased, non-alphanumeric -> underscore) -- same
          // transform applied when they were created in
          // /api/candidate/profile, so a filter entered as free text
          // here can still match a candidate's custom tag exactly.
          const customSlugs = filters.customSoftware
            .filter((s) => s.trim())
            .map((s) => s.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_"));
          params.set("software", [...filters.softwareSlugs, ...customSlugs].join(","));
        }
        if (filters.availableDays.length) {
          params.set("available_days", filters.availableDays.join(","));
        }
        if (filters.excludeDealbreakerSlugs.length) {
          params.set("exclude_dealbreakers", filters.excludeDealbreakerSlugs.join(","));
        }
        if (filters.distanceMiles) params.set("radius_miles", filters.distanceMiles);

        const res = await fetch(`/api/search?${params.toString()}`);
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || "Couldn't load candidates.");
        }
        const data = await res.json();
        if (!ignore) setResults(data.results ?? []);
      } catch (err) {
        if (!ignore) {
          setError(err instanceof Error ? err.message : "Something went wrong.");
          setResults([]);
        }
      } finally {
        if (!ignore) setLoading(false);
      }
    }

    run();
    return () => {
      ignore = true;
    };
  }, [tab, filters]);

  const filterCount = activeFilterCount(filters);

  return (
    <div className="max-w-5xl mx-auto px-5 md:px-10 py-7 md:py-12">
      <div className="mb-7 md:mb-10">
        <p className="text-[13px] text-ink-faint mb-1">Find your next hire</p>
        <h1 className="font-serif text-2xl md:text-3xl font-semibold">Browse candidates</h1>
      </div>

      <div className="mb-10 md:mb-12">
        <LiveStatHero
          location={location.city}
          radiusMiles={location.radiusMiles}
          onLocationChange={handleLocationChange}
          stats={[
            {
              count: loading ? null : results.length,
              label: tab === "full_time" ? "Full-time matches" : tab === "part_time" ? "Part-time matches" : "Temp matches",
            },
          ]}
        />
      </div>

      <div className="flex flex-wrap items-center gap-3 mb-5">
        <div className="flex gap-1 bg-line-soft p-1 rounded-xl">
          {TABS.map((t) => (
            <button
              key={t.slug}
              onClick={() => setTab(t.slug)}
              className={`px-4 py-2 rounded-lg text-[13.5px] font-semibold transition-colors ${
                tab === t.slug ? "bg-bg-raised text-ink shadow-sm" : "text-ink-faint hover:text-ink"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <button
          onClick={() => setSheetOpen(true)}
          className="flex items-center gap-2 rounded-[11px] border border-line bg-bg-raised px-4 py-2.5 text-[13.5px] font-semibold"
        >
          <SlidersHorizontal size={14} />
          Filters
          {filterCount > 0 && (
            <span className="w-[18px] h-[18px] rounded-full bg-teal text-white text-[10.5px] font-bold flex items-center justify-center">
              {filterCount}
            </span>
          )}
        </button>

        <span className="text-[13px] text-ink-faint md:ml-auto">
          {loading ? "Searching…" : `${results.length} results`}
        </span>
      </div>

      {error && (
        <div className="rounded-xl border border-coral/30 bg-coral/5 text-coral-deep text-[13.5px] p-4 mb-5">
          {error}
        </div>
      )}

      {!loading && !error && results.length === 0 && (
        <div className="rounded-xl border border-dashed border-line p-10 text-center">
          <Search size={22} className="mx-auto text-ink-faint mb-3" />
          <p className="text-[14.5px] font-semibold mb-1">No candidates match yet</p>
          <p className="text-[13px] text-ink-faint mb-4">
            Try widening your distance or clearing a filter -- or get notified the moment someone matching joins.
          </p>
          <button
            onClick={async () => {
              setAlertRegistered(false);
              const res = await fetch("/api/match-alerts", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  roleSlug: filters.roleSlugs[0],
                  city: filters.city || location.city,
                  state: filters.state,
                  filters,
                }),
              });
              if (res.ok) setAlertRegistered(true);
            }}
            disabled={alertRegistered}
            className="inline-flex items-center gap-2 text-[13.5px] font-semibold text-teal-deep border border-teal/30 bg-teal-tint px-4 py-2.5 rounded-control hover:bg-teal-tint/70 transition-colors disabled:opacity-70"
          >
            <Bell size={14} />
            {alertRegistered ? "You'll be notified" : "Notify me when a match appears"}
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {results.map((c) => (
          <CandidateCard key={c.id} candidate={c} />
        ))}
      </div>

      {/* End-of-list prompt -- previously a scrolled-to-the-bottom list
          just stopped with no next action offered. Only shown when
          there ARE some results (the zero-results case above already
          has its own full-width prompt), since "expand your radius"
          reads oddly when there's nothing to compare against yet. */}
      {!loading && !error && results.length > 0 && (
        <div className="mt-6 rounded-xl border border-dashed border-line p-6 text-center">
          <p className="text-[13.5px] text-ink-faint mb-3.5">
            That&apos;s everyone matching right now within {location.radiusMiles} mi.
          </p>
          <div className="flex flex-wrap gap-2.5 justify-center">
            <button
              onClick={() => handleLocationChange(location.city, Math.min(location.radiusMiles + 15, 100))}
              className="text-[13px] font-semibold text-teal-deep border border-teal/30 bg-teal-tint px-4 py-2 rounded-control hover:bg-teal-tint/70 transition-colors"
            >
              Expand search to {Math.min(location.radiusMiles + 15, 100)} mi
            </button>
            <button
              onClick={async () => {
                const res = await fetch("/api/match-alerts", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    roleSlug: filters.roleSlugs[0],
                    city: filters.city || location.city,
                    state: filters.state,
                    filters,
                  }),
                });
                if (res.ok) setAlertRegistered(true);
              }}
              disabled={alertRegistered}
              className="flex items-center gap-1.5 text-[13px] font-semibold text-ink-soft border border-line px-4 py-2 rounded-control hover:border-teal transition-colors disabled:opacity-70"
            >
              <Bell size={13} />
              {alertRegistered ? "You'll be notified of new listings" : "Notify me of new listings in this area"}
            </button>
          </div>
        </div>
      )}

      <FilterSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        filters={filters}
        onChange={setFilters}
        resultCount={results.length}
      />
    </div>
  );
}
