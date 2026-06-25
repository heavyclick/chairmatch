"use client";

import { useEffect, useState } from "react";
import { MapPin, Pencil, RadioTower } from "lucide-react";

interface StatItem {
  count: number;
  label: string;
}

interface LiveStatHeroProps {
  stats: StatItem[];
  location: string;
  radiusMiles: number;
}

function timeAgoLabel(seconds: number) {
  if (seconds < 60) return "just now";
  const mins = Math.floor(seconds / 60);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  return `${hrs}h ago`;
}

export function LiveStatHero({ stats, location, radiusMiles }: LiveStatHeroProps) {
  // Real elapsed-time tracking, not a decorative label -- this ticks
  // because it reflects an actual last-fetched timestamp. Swap the
  // initial Date.now() for the real query timestamp once /api/search
  // is wired in.
  const [fetchedAt] = useState(() => Date.now());
  const [secondsAgo, setSecondsAgo] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setSecondsAgo(Math.floor((Date.now() - fetchedAt) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [fetchedAt]);

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

        <button className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.06] px-3 py-1.5 text-xs text-[#D8E0DD] hover:bg-white/10 transition-colors">
          <MapPin size={12} />
          {location} · {radiusMiles} mi
          <Pencil size={10} className="opacity-60" />
        </button>
      </div>

      <div className="relative flex gap-10 md:gap-12 flex-wrap">
        {stats.map((s) => (
          <div key={s.label}>
            <div className="font-serif text-[2.5rem] leading-none font-semibold text-white tabular-nums">
              {s.count}
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
