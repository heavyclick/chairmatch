"use client";

import { X } from "lucide-react";
import { ChipSelect } from "@/components/shared/chip-select";
import { ChipSelectWithOther } from "@/components/shared/chip-select-with-other";
import { ROLES, SOFTWARE_OPTIONS, DEALBREAKER_OPTIONS, US_STATES, DAYS_OF_WEEK } from "@/lib/constants";

export interface BrowseFilters {
  roleSlugs: string[];
  city: string;
  state: string;
  zip: string;
  payUnit: "hourly" | "annual" | "custom";
  payMin: string;
  payMax: string;
  distanceMiles: string;
  minYearsExperience: string;
  softwareSlugs: string[];
  customSoftware: string[];
  openToRelocationOnly: boolean;
  openToRemoteOnly: boolean;
  availableDays: number[];
  excludeDealbreakerSlugs: string[];
}

export const DEFAULT_FILTERS: BrowseFilters = {
  roleSlugs: [],
  city: "",
  state: "",
  zip: "",
  payUnit: "hourly",
  payMin: "",
  payMax: "",
  distanceMiles: "15",
  minYearsExperience: "",
  softwareSlugs: [],
  customSoftware: [],
  openToRelocationOnly: false,
  openToRemoteOnly: false,
  availableDays: [],
  excludeDealbreakerSlugs: [],
};

export function activeFilterCount(f: BrowseFilters): number {
  let n = 0;
  if (f.roleSlugs.length) n++;
  if (f.city || f.state || f.zip) n++;
  if (f.payMin || f.payMax) n++;
  if (f.distanceMiles && f.distanceMiles !== "15") n++;
  if (f.minYearsExperience) n++;
  if (f.softwareSlugs.length || f.customSoftware.length) n++;
  if (f.openToRelocationOnly) n++;
  if (f.openToRemoteOnly) n++;
  if (f.availableDays.length) n++;
  if (f.excludeDealbreakerSlugs.length) n++;
  return n;
}

const PAY_PRESETS_BY_UNIT: Record<"hourly" | "annual", { slug: string; label: string; min: string; max: string }[]> = {
  hourly: [
    { slug: "20-35", label: "$20–35/hr", min: "20", max: "35" },
    { slug: "35-50", label: "$35–50/hr", min: "35", max: "50" },
    { slug: "50-65", label: "$50–65/hr", min: "50", max: "65" },
    { slug: "65+", label: "$65+/hr", min: "65", max: "" },
  ],
  annual: [
    { slug: "40-60k", label: "$40–60k/yr", min: "40000", max: "60000" },
    { slug: "60-80k", label: "$60–80k/yr", min: "60000", max: "80000" },
    { slug: "80-120k", label: "$80–120k/yr", min: "80000", max: "120000" },
    { slug: "120k+", label: "$120k+/yr", min: "120000", max: "" },
  ],
};

const inputClass =
  "w-full px-3.5 py-2.5 rounded-control border border-line bg-bg-raised text-[13.5px] outline-none focus:border-teal";

interface FilterSheetProps {
  open: boolean;
  onClose: () => void;
  filters: BrowseFilters;
  onChange: (f: BrowseFilters) => void;
  resultCount?: number;
}

export function FilterSheet({ open, onClose, filters, onChange, resultCount }: FilterSheetProps) {
  if (!open) return null;

  function update<K extends keyof BrowseFilters>(key: K, value: BrowseFilters[K]) {
    onChange({ ...filters, [key]: value });
  }

  const payPresets = filters.payUnit === "annual" ? PAY_PRESETS_BY_UNIT.annual : PAY_PRESETS_BY_UNIT.hourly;

  return (
    <div
      className="fixed inset-0 z-40 flex items-end md:items-center justify-center bg-ink/40"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full md:max-w-md bg-bg-raised rounded-t-2xl md:rounded-2xl max-h-[80vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 pt-5 pb-1 sticky top-0 bg-bg-raised">
          <h2 className="text-[17px] font-semibold">Filters</h2>
          <button onClick={onClose} className="text-ink-faint hover:text-ink p-1">
            <X size={18} />
          </button>
        </div>

        <div className="px-6 py-5 space-y-6">
          <div>
            <p className="text-[13px] font-semibold text-ink-soft mb-2.5">Role</p>
            <ChipSelect
              options={ROLES.map((r) => ({ slug: r.slug, label: r.label }))}
              selected={filters.roleSlugs}
              onChange={(v) => update("roleSlugs", v)}
            />
          </div>

          <div>
            <p className="text-[13px] font-semibold text-ink-soft mb-2.5">Location</p>
            <input
              placeholder="City"
              value={filters.city}
              onChange={(e) => update("city", e.target.value)}
              className={inputClass + " mb-2"}
            />
            <div className="grid grid-cols-2 gap-2">
              <select value={filters.state} onChange={(e) => update("state", e.target.value)} className={inputClass}>
                <option value="">State</option>
                {US_STATES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
              <input
                placeholder="ZIP"
                value={filters.zip}
                onChange={(e) => update("zip", e.target.value)}
                className={inputClass}
              />
            </div>
          </div>

          <div>
            <p className="text-[13px] font-semibold text-ink-soft mb-2.5">
              Distance <span className="text-teal-deep">{filters.distanceMiles} mi</span>
            </p>
            <input
              type="range"
              min={5}
              max={100}
              step={5}
              value={filters.distanceMiles}
              onChange={(e) => update("distanceMiles", e.target.value)}
              className="w-full accent-teal"
            />
            <div className="flex justify-between text-[11px] text-ink-faint mt-1">
              <span>5 mi</span>
              <span>100 mi</span>
            </div>
          </div>

          <div>
            <p className="text-[13px] font-semibold text-ink-soft mb-2.5">Pay</p>
            <div className="flex gap-1.5 mb-2.5">
              {(["hourly", "annual", "custom"] as const).map((u) => (
                <button
                  key={u}
                  type="button"
                  onClick={() => update("payUnit", u)}
                  className={`px-3 py-1.5 rounded-full text-[12px] font-semibold ${
                    filters.payUnit === u ? "bg-ink text-white" : "bg-line-soft text-ink-soft"
                  }`}
                >
                  {u === "hourly" ? "Hourly" : u === "annual" ? "Annual" : "Custom / Collections"}
                </button>
              ))}
            </div>

            {filters.payUnit !== "custom" ? (
              <>
                <ChipSelect
                  options={payPresets}
                  selected={
                    payPresets.find((p) => p.min === filters.payMin && p.max === filters.payMax)
                      ? [payPresets.find((p) => p.min === filters.payMin && p.max === filters.payMax)!.slug]
                      : []
                  }
                  onChange={(v) => {
                    const preset = payPresets.find((p) => p.slug === v[v.length - 1]);
                    if (preset) {
                      update("payMin", preset.min);
                      update("payMax", preset.max);
                    } else {
                      update("payMin", "");
                      update("payMax", "");
                    }
                  }}
                  multi={false}
                />
                <div className="grid grid-cols-2 gap-2.5 mt-2.5">
                  <input
                    placeholder="Custom min"
                    value={filters.payMin}
                    onChange={(e) => update("payMin", e.target.value)}
                    className={inputClass}
                    inputMode="numeric"
                  />
                  <input
                    placeholder="Custom max"
                    value={filters.payMax}
                    onChange={(e) => update("payMax", e.target.value)}
                    className={inputClass}
                    inputMode="numeric"
                  />
                </div>
              </>
            ) : (
              <p className="text-[12px] text-ink-faint">
                Showing candidates open to collections-based pay -- specific percentages vary by candidate, viewable on their profile.
              </p>
            )}
          </div>

          <div>
            <p className="text-[13px] font-semibold text-ink-soft mb-2.5">Years experience</p>
            <ChipSelect
              options={[
                { slug: "0", label: "Any" },
                { slug: "2", label: "2+" },
                { slug: "5", label: "5+" },
                { slug: "10", label: "10+" },
              ]}
              selected={[filters.minYearsExperience || "0"]}
              onChange={(v) => update("minYearsExperience", (v[v.length - 1] ?? "0") === "0" ? "" : v[v.length - 1])}
              multi={false}
            />
          </div>

          <div>
            <p className="text-[13px] font-semibold text-ink-soft mb-2.5">Software</p>
            <ChipSelectWithOther
              options={SOFTWARE_OPTIONS}
              selected={filters.softwareSlugs}
              onChange={(v) => update("softwareSlugs", v)}
              customValues={filters.customSoftware}
              onCustomChange={(v) => update("customSoftware", v)}
            />
          </div>

          <div>
            <p className="text-[13px] font-semibold text-ink-soft mb-2.5">Available on</p>
            <div className="flex gap-1.5">
              {DAYS_OF_WEEK.map((d) => {
                const active = filters.availableDays.includes(d.value);
                return (
                  <button
                    key={d.value}
                    type="button"
                    onClick={() =>
                      update(
                        "availableDays",
                        active
                          ? filters.availableDays.filter((v) => v !== d.value)
                          : [...filters.availableDays, d.value]
                      )
                    }
                    className={`w-9 h-9 rounded-lg text-[11.5px] font-bold ${
                      active ? "bg-teal text-white" : "bg-line-soft text-ink-faint"
                    }`}
                  >
                    {d.label}
                  </button>
                );
              })}
            </div>
          </div>

          <label className="flex items-center gap-2.5 cursor-pointer">
            <input
              type="checkbox"
              checked={filters.openToRelocationOnly}
              onChange={(e) => update("openToRelocationOnly", e.target.checked)}
              className="w-4 h-4 rounded accent-teal"
            />
            <span className="text-[14px]">Open to relocation only</span>
          </label>

          <label className="flex items-center gap-2.5 cursor-pointer">
            <input
              type="checkbox"
              checked={filters.openToRemoteOnly}
              onChange={(e) => update("openToRemoteOnly", e.target.checked)}
              className="w-4 h-4 rounded accent-teal"
            />
            <span className="text-[14px]">Open to remote only</span>
          </label>

          <div>
            <p className="text-[13px] font-semibold text-ink-soft mb-2.5">Exclude dealbreakers</p>
            <p className="text-[12px] text-ink-faint mb-2.5">
              Hide candidates who&apos;ve flagged these as dealbreakers (e.g. if you&apos;re a DSO).
            </p>
            <ChipSelect
              options={DEALBREAKER_OPTIONS}
              selected={filters.excludeDealbreakerSlugs}
              onChange={(v) => update("excludeDealbreakerSlugs", v)}
            />
          </div>
        </div>

        <div className="sticky bottom-0 bg-bg-raised border-t border-line px-6 py-4">
          <button
            onClick={onClose}
            className="w-full bg-teal text-white font-semibold text-[14.5px] py-3 rounded-control hover:bg-teal-deep transition-colors"
          >
            {resultCount !== undefined ? `Show ${resultCount} results` : "Apply filters"}
          </button>
        </div>
      </div>
    </div>
  );
}
