"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Trash2, ArrowRight, Bell, Plus, Pencil } from "lucide-react";
import { FilterSheet, DEFAULT_FILTERS, type BrowseFilters } from "@/components/owner/filter-sheet";

interface MatchedCandidate {
  id: string;
  full_name: string;
  photo_url: string | null;
  role: { label: string } | null;
  notified_at: string;
}

interface MatchAlert {
  id: string;
  label: string | null;
  city: string | null;
  state: string | null;
  role?: { label: string };
  match_count: number;
  matched_candidates: MatchedCandidate[];
  filters: BrowseFilters;
}

export default function MatchAlertsPage() {
  const [alerts, setAlerts] = useState<MatchAlert[]>([]);
  const [loading, setLoading] = useState(true);

  // Two-step flow: filters, then optional label. Two separate pieces
  // of state since FilterSheet's own "Apply filters" button is wired
  // directly to its onClose prop -- reusing one shared boolean for
  // both steps would close the label/save panel the instant the
  // filter sheet closes, the opposite of the intended flow.
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);
  const [labelStepOpen, setLabelStepOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [alertFilters, setAlertFilters] = useState<BrowseFilters>(DEFAULT_FILTERS);
  const [alertLabel, setAlertLabel] = useState("");
  const [saving, setSaving] = useState(false);

  function refetchAlerts() {
    return fetch("/api/match-alerts")
      .then((res) => res.json())
      .then((data) => setAlerts(data.alerts ?? []));
  }

  useEffect(() => {
    refetchAlerts().finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once on mount only
  }, []);

  async function removeAlert(id: string) {
    setAlerts((a) => a.filter((x) => x.id !== id));
    await fetch(`/api/match-alerts/${id}`, { method: "DELETE" });
  }

  function startCreate() {
    setEditingId(null);
    setAlertFilters(DEFAULT_FILTERS);
    setAlertLabel("");
    setFilterSheetOpen(true);
  }

  function startEdit(alert: MatchAlert) {
    setEditingId(alert.id);
    setAlertFilters({ ...DEFAULT_FILTERS, ...alert.filters });
    setAlertLabel(alert.label ?? "");
    setFilterSheetOpen(true);
  }

  async function saveAlert() {
    setSaving(true);
    try {
      const payload = {
        label: alertLabel || null,
        roleSlug: alertFilters.roleSlugs[0] || null,
        city: alertFilters.city || null,
        state: alertFilters.state || null,
        filters: alertFilters,
      };
      if (editingId) {
        await fetch(`/api/match-alerts/${editingId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } else {
        await fetch("/api/match-alerts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }
      setAlertLabel("");
      setAlertFilters(DEFAULT_FILTERS);
      setEditingId(null);
      setLabelStepOpen(false);
      await refetchAlerts();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-3xl mx-auto px-5 md:px-10 py-7 md:py-12">
      <div className="flex items-center justify-between mb-2">
        <h1 className="font-serif text-2xl md:text-3xl font-semibold">Match alerts</h1>
        <Link href="/owner/browse" className="text-[13px] font-semibold text-teal-deep flex items-center gap-1">
          Browse candidates <ArrowRight size={13} />
        </Link>
      </div>
      <p className="text-[13.5px] text-ink-faint mb-6">
        Standing notifications for when a candidate matching your exact criteria joins the
        platform — set your filters once and get notified every time a new match appears, not
        just the first one.
      </p>

      <button
        onClick={startCreate}
        className="flex items-center gap-1.5 text-[13px] font-semibold text-teal-deep px-3.5 py-2 rounded-control border border-teal/30 bg-teal-tint hover:bg-teal-tint/70 transition-colors mb-6"
      >
        <Plus size={14} /> Create alert
      </button>

      {loading && <p className="text-ink-faint text-[14px]">Loading…</p>}

      {!loading && alerts.length === 0 && (
        <div className="rounded-xl border border-dashed border-line p-10 text-center">
          <Bell size={22} className="mx-auto text-ink-faint mb-3" />
          <p className="text-[14.5px] font-semibold mb-1">No active alerts yet</p>
          <p className="text-[13px] text-ink-faint">
            Create one above, or save one from Browse when a search comes up empty.
          </p>
        </div>
      )}

      {alerts.length > 0 && (
        <div className="space-y-2.5">
          {alerts.map((a) => (
            <div key={a.id} className="p-4 rounded-xl border border-line bg-bg-raised">
              <div className="flex items-center gap-3.5">
                <div className="flex-1 min-w-0">
                  <span className="text-[14px] font-semibold">
                    {a.label || a.role?.label || "Custom alert"}
                  </span>
                  <div className="text-[12.5px] text-ink-faint mt-0.5">
                    {[a.city, a.state].filter(Boolean).join(", ") || "Any location"}
                    {" · "}
                    {a.match_count > 0 ? `${a.match_count} match${a.match_count === 1 ? "" : "es"} so far` : "watching"}
                  </div>
                </div>
                <button
                  onClick={() => startEdit(a)}
                  className="text-ink-faint hover:text-teal-deep p-1.5"
                  title="Edit"
                >
                  <Pencil size={15} />
                </button>
                <button
                  onClick={() => removeAlert(a.id)}
                  className="text-ink-faint hover:text-coral-deep p-1.5"
                  title="Remove"
                >
                  <Trash2 size={15} />
                </button>
              </div>

              {a.matched_candidates.length > 0 && (
                <div className="mt-3 pt-3 border-t border-line space-y-1.5">
                  {a.matched_candidates.map((c) => (
                    <Link
                      key={c.id}
                      href={`/owner/candidate/${c.id}`}
                      className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-line-soft transition-colors"
                    >
                      <div className="w-7 h-7 rounded-full bg-gradient-to-br from-teal to-teal-deep flex items-center justify-center shrink-0 overflow-hidden">
                        {c.photo_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={c.photo_url} alt={c.full_name} className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-white text-[10px] font-semibold">
                            {c.full_name.split(" ").map((p) => p[0]).join("").slice(0, 2).toUpperCase()}
                          </span>
                        )}
                      </div>
                      <span className="text-[13px] font-medium flex-1 min-w-0 truncate">{c.full_name}</span>
                      {c.role?.label && <span className="text-[11.5px] text-ink-faint shrink-0">{c.role.label}</span>}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <FilterSheet
        open={filterSheetOpen}
        onClose={() => {
          setFilterSheetOpen(false);
          setLabelStepOpen(true);
        }}
        filters={alertFilters}
        onChange={setAlertFilters}
      />

      {labelStepOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-ink/40"
          onClick={(e) => {
            if (e.target === e.currentTarget) setLabelStepOpen(false);
          }}
        >
          <div className="w-full md:max-w-sm bg-bg-raised rounded-t-2xl md:rounded-2xl p-5">
            <h3 className="text-[15px] font-semibold mb-1">{editingId ? "Edit alert" : "Name this alert"}</h3>
            <p className="text-[12.5px] text-ink-faint mb-3">Optional -- helps you tell alerts apart later.</p>
            <input
              value={alertLabel}
              onChange={(e) => setAlertLabel(e.target.value)}
              placeholder="e.g. Weekend hygienist, remote-friendly"
              className="w-full mb-3 px-3 py-2 rounded-lg border border-line text-[13.5px] bg-bg"
              autoFocus
            />
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setLabelStepOpen(false);
                  setEditingId(null);
                }}
                className="flex-1 py-2.5 rounded-control border border-line font-semibold text-[13.5px] hover:border-teal transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={saveAlert}
                disabled={saving}
                className="flex-1 py-2.5 rounded-control bg-teal text-white font-semibold text-[13.5px] hover:bg-teal-deep disabled:opacity-50"
              >
                {saving ? "Saving…" : editingId ? "Save changes" : "Save alert"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
