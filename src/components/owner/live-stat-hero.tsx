"use client";

import { useEffect, useState } from "react";
import { MapPin, Pencil, RadioTower, X } from "lucide-react";

interface StatItem {
  count: number | null;
  label: string;
}

interface LiveStatHeroProps {
  stats: StatItem[];
  location: string;
  radiusMiles: number;
  onLocationChange?: (city: string, radiusMiles: number) => void;
}

function timeAgoLabel(seconds: number) {
  if (seconds < 60) return "just now";
  const mins = Math.floor(seconds / 60);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  return `${hrs}h ago`;
}

export function LiveStatHero({ stats, location, radiusMiles, onLocationChange }: LiveStatHeroProps) {
  const [fetchedAt] = useState(() => Date.now());
  const [secondsAgo, setSecondsAgo] = useState(0);
  const [editing, setEditing] = useState(false);
  const [draftLocation, setDraftLocation] = useState(location);
  const [draftRadius, setDraftRadius] = useState(String(radiusMiles));

  useEffect(() => {
    const interval = setInterval(() => {
      setSecondsAgo(Math.floor((Date.now() - fetchedAt) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [fetchedAt]);

  function openEditor() {
    // Re-seed the draft fields from the latest props right when the
    // editor opens -- a real user-triggered event, not an effect
    // reacting to prop changes. location/radiusMiles only change as a
    // RESULT of a previous save (which already closes the editor), so
    // there's no scenario where the draft needs to silently re-sync
    // while the editor is closed.
    setDraftLocation(location);
    setDraftRadius(String(radiusMiles));
    setEditing(true);
  }

  function save() {
    onLocationChange?.(draftLocation, Number(draftRadius) || radiusMiles);
    setEditing(false);
  }

  return (
    <div className="relative overflow-hidden rounded-2xl bg-ink px-7 py-8 md:px-9 md:py-9">
      <div className="pointer-events-none absolute -top-1/2 right-[-10%] w-80 h-80 rounded-full bg-teal/30 blur-3xl" />

      <div className="relative flex items-start justify-between mb-6 flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75 animate-ping" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
          </span>
          <span className="text-xs font-semibold uppercase tracking-wider text-[#8FA39E]">
            Active near you
          </span>
          <span className="text-[11px] text-[#6F837E]">· updated {timeAgoLabel(secondsAgo)}</span>
        </div>

        <div className="relative">
          <button
            onClick={() => (editing ? setEditing(false) : openEditor())}
            disabled={!onLocationChange}
            className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.06] px-3 py-1.5 text-xs text-[#D8E0DD] hover:bg-white/10 transition-colors disabled:cursor-default"
          >
            <MapPin size={12} />
            {location} · {radiusMiles} mi
            {onLocationChange && <Pencil size={10} className="opacity-60" />}
          </button>

          {editing && (
            <div className="absolute right-0 top-full mt-2 w-64 bg-bg-raised rounded-xl shadow-xl p-4 z-20">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[12.5px] font-semibold text-ink">Edit location</span>
                <button onClick={() => setEditing(false)} className="text-ink-faint hover:text-ink">
                  <X size={14} />
                </button>
              </div>
              <input
                value={draftLocation}
                onChange={(e) => setDraftLocation(e.target.value)}
                placeholder="City"
                className="w-full px-3 py-2 mb-2 rounded-lg border border-line text-[13px] outline-none focus:border-teal text-ink"
              />
              <input
                value={draftRadius}
                onChange={(e) => setDraftRadius(e.target.value)}
                placeholder="Radius (miles)"
                inputMode="numeric"
                className="w-full px-3 py-2 mb-3 rounded-lg border border-line text-[13px] outline-none focus:border-teal text-ink"
              />
              <button
                onClick={save}
                className="w-full bg-teal text-white text-[13px] font-semibold py-2 rounded-lg hover:bg-teal-deep transition-colors"
              >
                Save
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="relative flex gap-10 md:gap-12 flex-wrap">
        {stats.map((s) => (
          <div key={s.label}>
            <div className="font-serif text-[2.5rem] leading-none font-semibold text-white tabular-nums">
              {s.count === null ? (
                <span className="inline-block w-10 h-9 rounded bg-white/10 animate-pulse align-middle" />
              ) : (
                s.count
              )}
            </div>
            <div className="text-[13px] text-[#9FB5B0] mt-1.5">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="relative flex items-center gap-1.5 mt-6 text-[11px] text-[#6F837E]">
        <RadioTower size={11} />
        Live count, refreshes as candidates update availability
      </div>
    </div>
  );
}
