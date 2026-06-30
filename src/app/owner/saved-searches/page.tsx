"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Star, Trash2, ArrowRight, Bell } from "lucide-react";

interface SavedSearch {
  id: string;
  label: string | null;
  role?: { label: string };
  pay_min: number | null;
  pay_max: number | null;
  distance_miles: number | null;
  new_match_count: number;
}

interface MatchAlert {
  id: string;
  label: string | null;
  city: string | null;
  state: string | null;
  role?: { label: string };
  notified_at: string | null;
}

export default function SavedSearchesPage() {
  const [searches, setSearches] = useState<SavedSearch[]>([]);
  const [alerts, setAlerts] = useState<MatchAlert[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/saved-searches").then((res) => res.json()),
      fetch("/api/match-alerts").then((res) => res.json()),
    ])
      .then(([searchData, alertData]) => {
        setSearches(searchData.results ?? []);
        setAlerts(alertData.alerts ?? []);
      })
      .finally(() => setLoading(false));
  }, []);

  async function remove(id: string) {
    setSearches((s) => s.filter((x) => x.id !== id));
    await fetch(`/api/saved-searches/${id}`, { method: "DELETE" });
  }

  async function removeAlert(id: string) {
    setAlerts((a) => a.filter((x) => x.id !== id));
    await fetch(`/api/match-alerts/${id}`, { method: "DELETE" });
  }

  return (
    <div className="max-w-3xl mx-auto px-5 md:px-10 py-7 md:py-12">
      <div className="flex items-center justify-between mb-7">
        <h1 className="font-serif text-2xl md:text-3xl font-semibold">Saved searches</h1>
        <Link href="/owner/browse" className="text-[13px] font-semibold text-teal-deep flex items-center gap-1">
          New search <ArrowRight size={13} />
        </Link>
      </div>

      {loading && <p className="text-ink-faint text-[14px]">Loading…</p>}

      {!loading && searches.length === 0 && (
        <div className="rounded-xl border border-dashed border-line p-10 text-center mb-10">
          <Star size={22} className="mx-auto text-ink-faint mb-3" />
          <p className="text-[14.5px] font-semibold mb-1">No saved searches yet</p>
          <p className="text-[13px] text-ink-faint mb-4">
            Save a search from Browse to get notified when new candidates match.
          </p>
          <Link href="/owner/browse" className="text-teal-deep font-semibold text-[13.5px]">
            Start browsing →
          </Link>
        </div>
      )}

      {searches.length > 0 && (
        <div className="space-y-2.5 mb-10">
          {searches.map((s) => (
            <div
              key={s.id}
              className="flex items-center gap-3.5 p-4 rounded-xl border border-line bg-bg-raised"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-[14.5px] font-semibold">{s.label || s.role?.label || "Saved search"}</span>
                  {s.new_match_count > 0 && (
                    <span className="text-[10.5px] font-bold text-white bg-coral px-2 py-0.5 rounded-full">
                      +{s.new_match_count} new
                    </span>
                  )}
                </div>
                <div className="text-[12.5px] text-ink-faint mt-0.5">
                  {[
                    s.pay_min && s.pay_max ? `$${s.pay_min}–${s.pay_max}` : null,
                    s.distance_miles ? `${s.distance_miles} mi` : null,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </div>
              </div>
              <Link
                href="/owner/browse"
                className="text-[12.5px] font-semibold text-teal-deep px-3 py-1.5 rounded-lg hover:bg-teal-tint transition-colors"
              >
                View
              </Link>
              <button
                onClick={() => remove(s.id)}
                className="text-ink-faint hover:text-coral-deep p-1.5"
                title="Remove"
              >
                <Trash2 size={15} />
              </button>
            </div>
          ))}
        </div>
      )}

      <h2 className="text-[15px] font-semibold mb-4 flex items-center gap-2">
        <Bell size={15} className="text-teal-deep" /> Match alerts
      </h2>
      <p className="text-[13px] text-ink-faint mb-4">
        Standing notifications for when a candidate matching specific criteria joins the platform.
      </p>

      {!loading && alerts.length === 0 && (
        <div className="rounded-xl border border-dashed border-line p-6 text-center text-[13px] text-ink-faint">
          No active alerts. Set one from Browse when a search comes up empty.
        </div>
      )}

      {alerts.length > 0 && (
        <div className="space-y-2.5">
          {alerts.map((a) => (
            <div key={a.id} className="flex items-center gap-3.5 p-4 rounded-xl border border-line bg-bg-raised">
              <div className="flex-1 min-w-0">
                <span className="text-[14px] font-semibold">
                  {a.label || a.role?.label || "Custom alert"}
                </span>
                <div className="text-[12.5px] text-ink-faint mt-0.5">
                  {[a.city, a.state].filter(Boolean).join(", ") || "Any location"}
                  {a.notified_at ? " · notified" : " · watching"}
                </div>
              </div>
              <button
                onClick={() => removeAlert(a.id)}
                className="text-ink-faint hover:text-coral-deep p-1.5"
                title="Remove"
              >
                <Trash2 size={15} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
