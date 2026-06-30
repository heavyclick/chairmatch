"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Search, MapPin, Star, EyeOff, Eye, Bell, Lock } from "lucide-react";
import { US_STATES } from "@/lib/constants";

interface Practice {
  id: string;
  practice_name: string;
  photo_url: string | null;
  specialty: string | null;
  culture_text: string | null;
  thrive_text: string | null;
  google_rating: number | null;
  google_rating_count: number | null;
  locations?: { city: string; state: string }[];
}

export default function CandidatePracticeBrowsePage() {
  const [gateChecked, setGateChecked] = useState(false);
  const [unlocked, setUnlocked] = useState(true);
  const [unlockAt, setUnlockAt] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [results, setResults] = useState<Practice[]>([]);
  const [searched, setSearched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [blockedIds, setBlockedIds] = useState<Set<string>>(new Set());
  const [watchRegistered, setWatchRegistered] = useState(false);

  useEffect(() => {
    fetch("/api/platform-config")
      .then((res) => res.json())
      .then((data) => {
        setUnlocked(data.candidateBrowseUnlocked);
        setUnlockAt(data.candidateBrowseUnlockAt);
      })
      .finally(() => setGateChecked(true));

    fetch("/api/candidate/practice-blocks")
      .then((res) => res.json())
      .then((data) => setBlockedIds(new Set((data.blocks ?? []).map((b: { practice_id: string }) => b.practice_id))))
      .catch(() => {});
  }, []);

  async function search(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setSearched(true);
    setWatchRegistered(false);
    try {
      const params = new URLSearchParams();
      if (name) params.set("name", name);
      if (city) params.set("city", city);
      if (state) params.set("state", state);
      const res = await fetch(`/api/candidate/practices?${params.toString()}`);
      const data = await res.json();
      setResults(data.results ?? []);
    } finally {
      setLoading(false);
    }
  }

  async function toggleHide(practiceId: string) {
    const isBlocked = blockedIds.has(practiceId);
    if (isBlocked) {
      await fetch(`/api/candidate/practice-blocks?practiceId=${practiceId}`, { method: "DELETE" });
      setBlockedIds((s) => {
        const next = new Set(s);
        next.delete(practiceId);
        return next;
      });
    } else {
      await fetch("/api/candidate/practice-blocks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ practiceId }),
      });
      setBlockedIds((s) => new Set(s).add(practiceId));
    }
  }

  async function registerWatch() {
    const res = await fetch("/api/candidate/practice-watch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ practiceNameQuery: name, city, state }),
    });
    if (res.ok) setWatchRegistered(true);
  }

  if (!gateChecked) {
    return <div className="min-h-screen flex items-center justify-center text-ink-faint">Loading…</div>;
  }

  if (!unlocked) {
    return (
      <div className="max-w-md mx-auto px-5 py-16 text-center">
        <Lock size={28} className="mx-auto text-ink-faint mb-4" />
        <h1 className="font-serif text-xl font-semibold mb-2">Coming soon</h1>
        <p className="text-[14px] text-ink-faint leading-relaxed mb-4">
          We&apos;re still onboarding practices in your area. Practice browsing unlocks{" "}
          {unlockAt ? `on ${new Date(unlockAt).toLocaleDateString()}` : "soon"} -- check back then.
        </p>
        <Link href="/candidate/dashboard" className="text-teal-deep font-semibold text-[13.5px]">
          ← Back to dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-5 md:px-10 py-7 md:py-12">
      <Link href="/candidate/dashboard" className="flex items-center gap-1.5 text-[13px] text-ink-faint hover:text-ink mb-6">
        <ArrowLeft size={14} /> Back to dashboard
      </Link>

      <h1 className="font-serif text-2xl md:text-3xl font-semibold mb-2">Browse practices</h1>
      <p className="text-[14px] text-ink-faint mb-7">
        Research practices in your area. You can&apos;t be contacted from here -- this is just for you to look around.
      </p>

      <form onSubmit={search} className="space-y-3 mb-8">
        <input
          placeholder="Practice name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full px-4 py-3 rounded-control border border-line bg-bg-raised text-[14.5px] outline-none focus:border-teal"
        />
        <div className="grid grid-cols-2 gap-2.5">
          <input
            placeholder="City"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            className="px-4 py-3 rounded-control border border-line bg-bg-raised text-[14.5px] outline-none focus:border-teal"
          />
          <select
            value={state}
            onChange={(e) => setState(e.target.value)}
            className="px-4 py-3 rounded-control border border-line bg-bg-raised text-[14.5px] outline-none focus:border-teal"
          >
            <option value="">State</option>
            {US_STATES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-teal disabled:opacity-60 text-white font-semibold text-[14.5px] py-3 rounded-control hover:bg-teal-deep transition-colors flex items-center justify-center gap-2"
        >
          <Search size={15} /> {loading ? "Searching…" : "Search"}
        </button>
      </form>

      {searched && !loading && results.length === 0 && (
        <div className="rounded-xl border border-dashed border-line p-8 text-center">
          <p className="text-[14px] font-semibold mb-1">No matches yet</p>
          <p className="text-[13px] text-ink-faint mb-4">
            Get notified if this practice joins ChairMatch.
          </p>
          <button
            onClick={registerWatch}
            disabled={!name.trim() || watchRegistered}
            className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-teal-deep border border-teal/30 bg-teal-tint px-4 py-2 rounded-control disabled:opacity-70"
          >
            <Bell size={13} /> {watchRegistered ? "You'll be notified" : "Notify me when they join"}
          </button>
        </div>
      )}

      <div className="space-y-2.5">
        {results.map((p) => {
          const location = p.locations?.[0];
          const isHidden = blockedIds.has(p.id);
          return (
            <div key={p.id} className="flex items-center gap-3.5 p-4 rounded-xl border border-line bg-bg-raised">
              <Link href={`/candidate/practice/${p.id}`} className="flex items-center gap-3.5 flex-1 min-w-0">
                <div className="w-11 h-11 rounded-xl overflow-hidden bg-gradient-to-br from-teal to-teal-deep flex items-center justify-center shrink-0">
                  {p.photo_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={p.photo_url} alt={p.practice_name} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-white font-serif text-sm">{p.practice_name[0]}</span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[14px] font-semibold">{p.practice_name}</p>
                  <p className="text-[12.5px] text-ink-faint flex items-center gap-1">
                    {location && (
                      <>
                        <MapPin size={10} /> {location.city}, {location.state}
                      </>
                    )}
                  </p>
                </div>
              </Link>
              {p.google_rating != null && (
                <div className="flex items-center gap-1 text-[12.5px] font-semibold shrink-0">
                  <Star size={12} className="text-gold fill-gold" /> {p.google_rating.toFixed(1)}
                </div>
              )}
              <button
                onClick={() => toggleHide(p.id)}
                title={isHidden ? "Unhide from this practice" : "Hide my profile from this practice"}
                className={`shrink-0 p-2 rounded-lg transition-colors ${
                  isHidden ? "text-coral-deep bg-coral/10" : "text-ink-faint hover:bg-line-soft"
                }`}
              >
                {isHidden ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
