"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Users, FileText, Pause, Play, Trash2, ExternalLink, Loader2 } from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────
interface Application {
  id: string;
  status: "pending" | "reviewed" | "hired" | "rejected";
  cover_note: string | null;
  created_at: string;
  candidate: {
    id: string;
    full_name: string;
    photo_url: string | null;
    city: string | null;
    state: string | null;
    years_experience: number | null;
    pay_range_min: number | null;
    pay_range_max: number | null;
    value_add_text: string | null;
    role: { label: string } | null;
  } | null;
}

interface Posting {
  id: string;
  title: string;
  status: string;
  employment_type: string | null;
  city: string | null;
  state: string | null;
  pay_min: number | null;
  pay_max: number | null;
  pay_unit: string | null;
  description: string | null;
  requirements: string[];
  benefits: string[];
  not_a_fit_if: string | null;
  expires_at: string | null;
  role: { label: string } | null;
  applications: Application[];
}

const STATUS_LABELS: Record<string, { label: string; next: string; nextLabel: string }> = {
  pending:  { label: "New",      next: "reviewed", nextLabel: "Mark reviewed" },
  reviewed: { label: "Reviewed", next: "hired",    nextLabel: "Mark hired" },
  hired:    { label: "Hired 🎉", next: "rejected", nextLabel: "Mark rejected" },
  rejected: { label: "Not moving forward", next: "pending", nextLabel: "Reset to new" },
};

function daysAgo(iso: string) {
  const d = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  return d === 0 ? "Today" : d === 1 ? "Yesterday" : `${d}d ago`;
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function JobDetailPage() {
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const router = useRouter();
  const postingId = params.id;

  const [posting, setPosting] = useState<Posting | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<"posting" | "applicants">(
    searchParams.get("tab") === "applicants" ? "applicants" : "posting"
  );
  const [statusUpdating, setStatusUpdating] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchPosting = useCallback(async () => {
    try {
      const res = await fetch(`/api/owner/job-postings/${postingId}`);
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Failed to load posting."); return; }
      setPosting(data.posting);
    } catch {
      setError("Something went wrong.");
    } finally {
      setLoading(false);
    }
  }, [postingId]);

  useEffect(() => { fetchPosting(); }, [fetchPosting]);

  async function updatePostingStatus(newStatus: string) {
    setActionLoading(true);
    await fetch(`/api/owner/job-postings/${postingId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    await fetchPosting();
    setActionLoading(false);
  }

  async function deletePosting() {
    if (!confirm("Delete this job posting? This cannot be undone and will remove all applications.")) return;
    setActionLoading(true);
    await fetch(`/api/owner/job-postings/${postingId}`, { method: "DELETE" });
    router.push("/owner/jobs");
  }

  async function updateApplicationStatus(appId: string, newStatus: string) {
    setStatusUpdating(appId);
    await fetch(`/api/owner/job-postings/${postingId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ application_id: appId, application_status: newStatus }),
    });
    await fetchPosting();
    setStatusUpdating(null);
  }

  if (loading) return <div style={{ padding: 40, textAlign: "center", color: "var(--ink-faint)", fontSize: 14 }}>Loading…</div>;
  if (error || !posting) return <div style={{ padding: 40, textAlign: "center", color: "var(--coral)", fontSize: 14 }}>{error ?? "Not found."}</div>;

  const pendingCount = posting.applications.filter((a) => a.status === "pending").length;

  return (
    <div style={{ maxWidth: 860, margin: "0 auto", padding: "24px 20px 60px" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, marginBottom: 20, flexWrap: "wrap" }}>
        <div>
          <Link href="/owner/jobs" style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 13, color: "var(--ink-soft)", textDecoration: "none", marginBottom: 6 }}>
            <ArrowLeft size={13} /> All postings
          </Link>
          <h1 style={{ fontFamily: "var(--font-serif)", fontSize: 22, fontWeight: 700, margin: 0 }}>{posting.title}</h1>
          <p style={{ fontSize: 13, color: "var(--ink-soft)", marginTop: 3 }}>
            {[posting.city, posting.state].filter(Boolean).join(", ")}
            {posting.employment_type && ` · ${posting.employment_type.replace("_", "-")}`}
            {" · "}
            <span style={{ fontWeight: 600, color: posting.status === "active" ? "var(--teal-deep)" : "var(--ink-faint)", textTransform: "capitalize" }}>
              {posting.status}
            </span>
          </p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {posting.status === "active" && (
            <button onClick={() => updatePostingStatus("paused")} disabled={actionLoading} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 13, fontWeight: 600, color: "var(--ink-soft)", background: "var(--bg-raised)", border: "1px solid var(--line)", borderRadius: "var(--radius-control)", padding: "8px 14px", cursor: "pointer" }}>
              <Pause size={13} /> Pause
            </button>
          )}
          {(posting.status === "paused" || posting.status === "draft") && (
            <button onClick={() => updatePostingStatus("active")} disabled={actionLoading} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 13, fontWeight: 600, color: "#fff", background: "var(--teal)", border: "none", borderRadius: "var(--radius-control)", padding: "8px 14px", cursor: "pointer" }}>
              <Play size={13} /> {posting.status === "draft" ? "Publish" : "Reactivate"}
            </button>
          )}
          <Link href={`/owner/jobs/${posting.id}/edit`} style={{ fontSize: 13, fontWeight: 600, color: "var(--ink-soft)", background: "var(--bg-raised)", border: "1px solid var(--line)", borderRadius: "var(--radius-control)", padding: "8px 14px", textDecoration: "none" }}>
            Edit
          </Link>
          <button onClick={deletePosting} disabled={actionLoading} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 13, color: "var(--coral)", background: "none", border: "1px solid var(--coral)/30", borderRadius: "var(--radius-control)", padding: "8px 12px", cursor: "pointer" }}>
            <Trash2 size={13} />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 0, borderBottom: "1px solid var(--line)", marginBottom: 24 }}>
        {[
          { key: "posting", label: "Posting", icon: <FileText size={13} /> },
          { key: "applicants", label: `Applicants${posting.applications.length > 0 ? ` (${posting.applications.length})` : ""}`, icon: <Users size={13} />, badge: pendingCount },
        ].map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key as "posting" | "applicants")}
            style={{ display: "flex", alignItems: "center", gap: 6, padding: "10px 16px", fontSize: 13.5, fontWeight: 600, background: "none", border: "none", borderBottom: tab === t.key ? "2px solid var(--teal)" : "2px solid transparent", color: tab === t.key ? "var(--teal-deep)" : "var(--ink-soft)", cursor: "pointer", marginBottom: -1 }}
          >
            {t.icon} {t.label}
            {t.badge ? (
              <span style={{ background: "var(--coral)", color: "#fff", fontSize: 10, fontWeight: 700, borderRadius: 999, padding: "1px 6px" }}>
                {t.badge}
              </span>
            ) : null}
          </button>
        ))}
      </div>

      {/* Posting tab */}
      {tab === "posting" && (
        <div style={{ maxWidth: 600 }}>
          {posting.description && (
            <Section title="Description">
              <p style={{ fontSize: 14.5, lineHeight: 1.7, whiteSpace: "pre-wrap" }}>{posting.description}</p>
            </Section>
          )}
          {posting.requirements?.length > 0 && (
            <Section title="Requirements">
              <ul style={{ paddingLeft: 18, margin: 0 }}>
                {posting.requirements.map((r, i) => <li key={i} style={{ fontSize: 14, marginBottom: 4 }}>{r}</li>)}
              </ul>
            </Section>
          )}
          {posting.benefits?.length > 0 && (
            <Section title="Benefits">
              <ul style={{ paddingLeft: 18, margin: 0 }}>
                {posting.benefits.map((b, i) => <li key={i} style={{ fontSize: 14, marginBottom: 4 }}>{b}</li>)}
              </ul>
            </Section>
          )}
          {posting.not_a_fit_if && (
            <Section title="This role isn't a fit if…">
              <p style={{ fontSize: 14, lineHeight: 1.65, fontStyle: "italic", color: "var(--ink-soft)", borderLeft: "3px solid var(--amber, #f59e0b)", paddingLeft: 12 }}>{posting.not_a_fit_if}</p>
            </Section>
          )}
        </div>
      )}

      {/* Applicants tab */}
      {tab === "applicants" && (
        <div>
          {posting.applications.length === 0 ? (
            <div style={{ border: "1.5px dashed var(--line)", borderRadius: 14, padding: "36px 24px", textAlign: "center", color: "var(--ink-faint)" }}>
              <Users size={22} style={{ margin: "0 auto 10px", display: "block" }} />
              <p style={{ fontSize: 14.5, fontWeight: 600, marginBottom: 4 }}>No applications yet</p>
              <p style={{ fontSize: 13, color: "var(--ink-soft)" }}>Candidates who apply will appear here.</p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {posting.applications.map((app) => (
                <ApplicantCard
                  key={app.id}
                  app={app}
                  onStatusChange={(newStatus) => updateApplicationStatus(app.id, newStatus)}
                  updating={statusUpdating === app.id}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 24 }}>
      <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.07em", textTransform: "uppercase", color: "var(--ink-faint)", marginBottom: 8 }}>{title}</p>
      {children}
    </div>
  );
}

function ApplicantCard({ app, onStatusChange, updating }: { app: Application; onStatusChange: (s: string) => void; updating: boolean }) {
  const c = app.candidate;
  const statusInfo = STATUS_LABELS[app.status] ?? { label: app.status, next: "pending", nextLabel: "Reset" };

  return (
    <div style={{ border: "1px solid var(--line)", borderRadius: 14, padding: "16px 18px", background: "var(--bg-raised)" }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {c?.photo_url ? (
            <img src={c.photo_url} alt="" style={{ width: 40, height: 40, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} />
          ) : (
            <div style={{ width: 40, height: 40, borderRadius: "50%", background: "var(--teal-tint)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, flexShrink: 0 }}>
              {c?.full_name?.[0] ?? "?"}
            </div>
          )}
          <div>
            <p style={{ fontWeight: 700, fontSize: 14.5, margin: 0 }}>{c?.full_name ?? "Unknown candidate"}</p>
            <p style={{ fontSize: 12.5, color: "var(--ink-soft)", margin: "2px 0 0" }}>
              {c?.role?.label}
              {c?.years_experience ? ` · ${c.years_experience}yr exp` : ""}
              {(c?.city || c?.state) ? ` · ${[c.city, c.state].filter(Boolean).join(", ")}` : ""}
            </p>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <span style={{ fontSize: 11.5, fontWeight: 600, padding: "3px 10px", borderRadius: 999, background: app.status === "hired" ? "var(--teal-tint)" : app.status === "rejected" ? "var(--line)" : "var(--bg)", border: "1px solid var(--line)", color: app.status === "hired" ? "var(--teal-deep)" : "var(--ink-soft)" }}>
            {statusInfo.label}
          </span>
          <span style={{ fontSize: 11.5, color: "var(--ink-faint)" }}>{daysAgo(app.created_at)}</span>
        </div>
      </div>

      {app.cover_note && (
        <div style={{ marginTop: 12, padding: "10px 14px", background: "var(--bg)", border: "1px solid var(--line)", borderRadius: 10 }}>
          <p style={{ fontSize: 13.5, lineHeight: 1.6, fontStyle: "italic", color: "var(--ink-soft)", margin: 0 }}>"{app.cover_note}"</p>
        </div>
      )}

      {c?.value_add_text && (
        <div style={{ marginTop: 8 }}>
          <p style={{ fontSize: 12, fontWeight: 700, color: "var(--ink-faint)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>Their profile summary</p>
          <p style={{ fontSize: 13.5, lineHeight: 1.6, color: "var(--ink)", margin: 0 }}>{c.value_add_text}</p>
        </div>
      )}

      <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 14, flexWrap: "wrap" }}>
        {c?.id && (
          <Link href={`/owner/candidate/${c.id}`} style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 13, fontWeight: 600, color: "var(--teal-deep)", background: "var(--teal-tint)", border: "1px solid var(--teal)/20", borderRadius: "var(--radius-control)", padding: "6px 12px", textDecoration: "none" }}>
            View full profile <ExternalLink size={11} />
          </Link>
        )}
        <button
          onClick={() => onStatusChange(statusInfo.next)}
          disabled={updating}
          style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 13, fontWeight: 600, color: "var(--ink-soft)", background: "var(--bg-raised)", border: "1px solid var(--line)", borderRadius: "var(--radius-control)", padding: "6px 12px", cursor: "pointer" }}
        >
          {updating ? <Loader2 size={12} className="animate-spin" /> : null}
          {statusInfo.nextLabel}
        </button>
        {app.status !== "rejected" && (
          <button
            onClick={() => onStatusChange("rejected")}
            disabled={updating}
            style={{ fontSize: 13, fontWeight: 600, color: "var(--coral)", background: "none", border: "1px solid var(--coral)/25", borderRadius: "var(--radius-control)", padding: "6px 12px", cursor: "pointer" }}
          >
            Not moving forward
          </button>
        )}
      </div>
    </div>
  );
}
