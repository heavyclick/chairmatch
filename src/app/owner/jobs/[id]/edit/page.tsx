"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Loader2, Save } from "lucide-react";

interface DraftFields {
  title?: string;
  employment_type?: string;
  city?: string;
  state?: string;
  pay_min?: number | null;
  pay_max?: number | null;
  pay_unit?: string | null;
  description?: string;
  requirements?: string[];
  benefits?: string[];
  not_a_fit_if?: string;
}

const EMPLOYMENT_TYPE_LABELS: Record<string, string> = {
  full_time: "Full-time",
  part_time: "Part-time",
  temp: "Temp / Relief",
  contract: "Contract",
};

export default function EditJobPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const postingId = params.id;

  const [draft, setDraft] = useState<DraftFields>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const fetchPosting = useCallback(async () => {
    try {
      const res = await fetch(`/api/owner/job-postings/${postingId}`);
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Failed to load."); return; }
      const p = data.posting;
      setDraft({
        title: p.title ?? "",
        employment_type: p.employment_type ?? "",
        city: p.city ?? "",
        state: p.state ?? "",
        pay_min: p.pay_min ?? null,
        pay_max: p.pay_max ?? null,
        pay_unit: p.pay_unit ?? "",
        description: p.description ?? "",
        requirements: Array.isArray(p.requirements) ? p.requirements : [],
        benefits: Array.isArray(p.benefits) ? p.benefits : [],
        not_a_fit_if: p.not_a_fit_if ?? "",
      });
    } catch {
      setError("Something went wrong loading this posting.");
    } finally {
      setLoading(false);
    }
  }, [postingId]);

  useEffect(() => { fetchPosting(); }, [fetchPosting]);

  async function handleSave() {
    if (!draft.title?.trim()) { setError("Title is required."); return; }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/owner/job-postings/${postingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Failed to save."); return; }
      setSaved(true);
      setTimeout(() => router.push(`/owner/jobs/${postingId}`), 800);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  function set(field: keyof DraftFields, value: unknown) {
    setDraft((prev) => ({ ...prev, [field]: value }));
    setSaved(false);
  }

  function handleListField(field: "requirements" | "benefits", value: string) {
    const items = value.split("\n").map((l) => l.trim()).filter(Boolean);
    set(field, items);
  }

  const inputStyle: React.CSSProperties = {
    width: "100%", padding: "9px 12px", borderRadius: 8,
    border: "1px solid #e2e8e6", fontSize: 13.5,
    background: "#ffffff", boxSizing: "border-box",
  };
  const labelStyle: React.CSSProperties = {
    fontSize: 11.5, fontWeight: 700, letterSpacing: "0.06em",
    textTransform: "uppercase", color: "#8fa8a3",
    display: "block", marginBottom: 5,
  };

  if (loading) return <div style={{ padding: 40, textAlign: "center", color: "#9ab0ac" }}>Loading…</div>;

  return (
    <div style={{ maxWidth: 680, margin: "0 auto", padding: "28px 20px 60px" }}>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 28, gap: 12, flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button
            onClick={() => router.push(`/owner/jobs/${postingId}`)}
            style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 13, color: "#6b7e7a", background: "none", border: "none", cursor: "pointer" }}
          >
            <ArrowLeft size={14} /> Back
          </button>
          <span style={{ color: "#e2e8e6" }}>|</span>
          <h1 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>Edit posting</h1>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          style={{ display: "flex", alignItems: "center", gap: 6, background: "#2D705F", color: "#ffffff", fontSize: 13.5, fontWeight: 700, padding: "10px 20px", borderRadius: 8, border: "none", cursor: "pointer" }}
        >
          {saving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} color="#ffffff" />}
          {saved ? "Saved!" : saving ? "Saving…" : "Save changes"}
        </button>
      </div>

      {error && (
        <div style={{ background: "#fff1f0", border: "1px solid #ffb3ae", color: "#c0392b", fontSize: 13.5, padding: "10px 14px", borderRadius: 8, marginBottom: 20 }}>
          {error}
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

        <div>
          <label style={labelStyle}>Job Title *</label>
          <input style={inputStyle} value={draft.title ?? ""} onChange={(e) => set("title", e.target.value)} placeholder="e.g. Dental Hygienist – Part-Time" />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div>
            <label style={labelStyle}>Employment Type</label>
            <select style={inputStyle} value={draft.employment_type ?? ""} onChange={(e) => set("employment_type", e.target.value)}>
              <option value="">Select…</option>
              {Object.entries(EMPLOYMENT_TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Pay Unit</label>
            <select style={inputStyle} value={draft.pay_unit ?? ""} onChange={(e) => set("pay_unit", e.target.value)}>
              <option value="">Select…</option>
              <option value="hour">Per hour</option>
              <option value="year">Per year</option>
            </select>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div>
            <label style={labelStyle}>Pay Min</label>
            <input style={inputStyle} type="number" value={draft.pay_min ?? ""} onChange={(e) => set("pay_min", e.target.value ? Number(e.target.value) : null)} placeholder="e.g. 40" />
          </div>
          <div>
            <label style={labelStyle}>Pay Max</label>
            <input style={inputStyle} type="number" value={draft.pay_max ?? ""} onChange={(e) => set("pay_max", e.target.value ? Number(e.target.value) : null)} placeholder="e.g. 55" />
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div>
            <label style={labelStyle}>City</label>
            <input style={inputStyle} value={draft.city ?? ""} onChange={(e) => set("city", e.target.value)} placeholder="Austin" />
          </div>
          <div>
            <label style={labelStyle}>State</label>
            <input style={inputStyle} value={draft.state ?? ""} onChange={(e) => set("state", e.target.value.toUpperCase().slice(0, 2))} placeholder="TX" maxLength={2} />
          </div>
        </div>

        <div>
          <label style={labelStyle}>Description</label>
          <textarea style={{ ...inputStyle, minHeight: 110, resize: "vertical" }} value={draft.description ?? ""} onChange={(e) => set("description", e.target.value)} placeholder="What does a typical day look like? What's the practice culture?" />
        </div>

        <div>
          <label style={labelStyle}>Requirements <span style={{ fontWeight: 400, textTransform: "none", letterSpacing: 0 }}>(one per line)</span></label>
          <textarea style={{ ...inputStyle, minHeight: 80, resize: "vertical" }} value={(draft.requirements ?? []).join("\n")} onChange={(e) => handleListField("requirements", e.target.value)} placeholder={"Active RDH license\n2+ years chairside experience"} />
        </div>

        <div>
          <label style={labelStyle}>Benefits <span style={{ fontWeight: 400, textTransform: "none", letterSpacing: 0 }}>(one per line)</span></label>
          <textarea style={{ ...inputStyle, minHeight: 70, resize: "vertical" }} value={(draft.benefits ?? []).join("\n")} onChange={(e) => handleListField("benefits", e.target.value)} placeholder={"Competitive hourly rate\nFlexible schedule"} />
        </div>

        <div>
          <label style={labelStyle}>This role isn't a fit if…</label>
          <textarea style={{ ...inputStyle, minHeight: 90, resize: "vertical" }} value={draft.not_a_fit_if ?? ""} onChange={(e) => set("not_a_fit_if", e.target.value)} placeholder="This role isn't a fit if you need guaranteed full-time hours from day one…" />
        </div>

        <div style={{ paddingTop: 8 }}>
          <button
            onClick={handleSave}
            disabled={saving}
            style={{ display: "flex", alignItems: "center", gap: 6, background: "#2D705F", color: "#ffffff", fontSize: 14, fontWeight: 700, padding: "12px 28px", borderRadius: 8, border: "none", cursor: "pointer" }}
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} color="#ffffff" />}
            {saved ? "Saved!" : saving ? "Saving…" : "Save changes"}
          </button>
        </div>

      </div>
    </div>
  );
}
