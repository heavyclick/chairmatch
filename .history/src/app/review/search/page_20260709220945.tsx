"use client";

import { useState } from "react";
import Link from "next/link";
import { Search, MapPin, Star } from "lucide-react";
import { US_STATES } from "@/lib/constants";

interface SearchResult {
  id: string;
  full_name: string;
  photo_url: string | null;
  city: string | null;
  state: string | null;
  role?: { label: string };
  averageRating: number | null;
  reviewCount: number;
}

export default function PublicCandidateSearchPage() {
  const [name, setName] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searched, setSearched] = useState(false);
  const [loading, setLoading] = useState(false);

  async function search(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setSearched(true);
    try {
      const params = new URLSearchParams();
      if (name) params.set("name", name);
      if (city) params.set("city", city);
      if (state) params.set("state", state);
      const res = await fetch(`/api/reviews/search?${params.toString()}`);
      const data = await res.json();
      setResults(data.results ?? []);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-bg">
      <div className="max-w-lg mx-auto px-5 py-10">
        <div className="flex items-center gap-2 justify-center mb-8">
          <span className="w-2 h-2 rounded-full bg-coral" />
          <span className="font-serif text-lg font-semibold">ChairMatch</span>
        </div>

        <h1 className="font-serif text-2xl font-semibold text-center mb-2">Find someone to review</h1>
        <p className="text-[13.5px] text-ink-faint text-center mb-7">
          Search by name and location to leave a review for dental staff you&apos;ve worked with.
        </p>

        <form onSubmit={search} className="space-y-3 mb-8">
          <input
            placeholder="Name"
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
          <p className="text-center text-[13.5px] text-ink-faint">No matches found.</p>
        )}

        <div className="space-y-2.5">
          {results.map((r) => (
            <Link
              key={r.id}
              href={`/review/${r.id}`}
              className="flex items-center gap-3.5 p-4 rounded-xl border border-line bg-bg-raised hover:border-teal transition-colors"
            >
              <div className="w-11 h-11 rounded-full overflow-hidden bg-gradient-to-br from-teal to-teal-deep flex items-center justify-center shrink-0">
                {r.photo_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={r.photo_url} alt={r.full_name} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-white font-serif text-sm">{r.full_name[0]}</span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[14px] font-semibold">{r.full_name}</p>
                <p className="text-[12.5px] text-ink-faint flex items-center gap-1">
                  {r.role?.label}
                  {r.city && (
                    <>
                      <span>·</span> <MapPin size={10} /> {r.city}, {r.state}
                    </>
                  )}
                </p>
              </div>
              {r.averageRating != null && (
                <div className="flex items-center gap-1 text-[12.5px] font-semibold shrink-0">
                  <Star size={12} className="text-gold fill-gold" /> {r.averageRating.toFixed(1)}
                </div>
              )}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
