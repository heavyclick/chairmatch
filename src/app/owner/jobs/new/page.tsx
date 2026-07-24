"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Send, Loader2, ArrowLeft, Pencil, Bot } from "lucide-react";

// ── Default tab constant ──────────────────────────────────────────────────────
// "ai" starts in chat mode; "manual" starts in form mode.
// This is also the default if the owner clicks "Post a Job" fresh.
const DEFAULT_MODE: "ai" | "manual" = "ai";

// ── Types ─────────────────────────────────────────────────────────────────────
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

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

const EMPLOYMENT_TYPE_LABELS: Record<string, string> = {
  full_time: "Full-time",
  part_time: "Part-time",
  temp: "Temp / Relief",
  contract: "Contract",
};

// ── Main page ─────────────────────────────────────────────────────────────────
export default function NewJobPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"ai" | "manual">(DEFAULT_MODE);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Shared draft state — both modes read/write to the same object so
  // switching from AI to manual pre-fills the form with whatever the
  // AI already extracted.
  const [draft, setDraft] = useState<DraftFields>({});

  async function handlePublish(status: "draft" | "active") {
    if (!draft.title?.trim()) {
      setError("Job title is required before publishing.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/owner/job-postings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...draft, status }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to save posting.");
        return;
      }
      router.push("/owner/jobs");
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", minHeight: "calc(100vh - 60px)" }}>
      {/* Top bar */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 24px", borderBottom: "1px solid var(--line)", background: "var(--bg-raised)", flexWrap: "wrap", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button onClick={() => router.push("/owner/jobs")} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "var(--ink-soft)", background: "none", border: "none", cursor: "pointer" }}>
            <ArrowLeft size={14} /> Back
          </button>
          <span style={{ color: "var(--line)", fontSize: 18 }}>|</span>
          <h1 style={{ fontFamily: "var(--font-serif)", fontSize: 17, fontWeight: 700, margin: 0 }}>New Job Posting</h1>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {mode === "ai" && (
            <button
              onClick={() => setMode("manual")}
              style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12.5, color: "var(--ink-soft)", background: "none", border: "1px solid var(--line)", borderRadius: "var(--radius-control)", padding: "6px 12px", cursor: "pointer" }}
            >
              <Pencil size={12} /> Fill it in myself
            </button>
          )}
          {mode === "manual" && (
            <button
              onClick={() => setMode("ai")}
              style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12.5, color: "var(--teal-deep)", background: "var(--teal-tint)", border: "1px solid var(--teal)/20", borderRadius: "var(--radius-control)", padding: "6px 12px", cursor: "pointer" }}
            >
              <Bot size={12} /> Switch to AI chat
            </button>
          )}
          <button
            onClick={() => handlePublish("draft")}
            disabled={submitting}
            style={{ fontSize: 13, fontWeight: 600, color: "var(--ink-soft)", background: "var(--bg-raised)", border: "1px solid var(--line)", borderRadius: "var(--radius-control)", padding: "8px 16px", cursor: "pointer" }}
          >
            Save draft
          </button>
          <button
            onClick={() => handlePublish("active")}
            disabled={submitting}
            style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 700, color: "#fff", background: "var(--teal)", border: "none", borderRadius: "var(--radius-control)", padding: "8px 18px", cursor: "pointer" }}
          >
            {submitting ? <Loader2 size={13} className="animate-spin" /> : null}
            Publish
          </button>
        </div>
      </div>

      {error && (
        <div style={{ background: "var(--coral-tint, #fff1f0)", borderBottom: "1px solid var(--coral)", color: "var(--coral-deep)", fontSize: 13.5, padding: "10px 24px" }}>
          {error}
        </div>
      )}

      {/* Split panel */}
      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
        {mode === "ai" ? (
          <AIChatPanel draft={draft} onDraftUpdate={setDraft} />
        ) : (
          <ManualFormPanel draft={draft} onDraftUpdate={setDraft} />
        )}
        <PreviewPanel draft={draft} />
      </div>
    </div>
  );
}

// ── AI Chat Panel ─────────────────────────────────────────────────────────────
function AIChatPanel({ draft, onDraftUpdate }: { draft: DraftFields; onDraftUpdate: (d: DraftFields) => void }) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [started, setStarted] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Kick off the AI conversation on mount.
  useEffect(() => {
    if (started) return;
    setStarted(true);
    sendToAI([]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function sendToAI(history: ChatMessage[], userMessage?: string) {
    setLoading(true);
    const newHistory: ChatMessage[] = userMessage
      ? [...history, { role: "user", content: userMessage }]
      : history;

    try {
      const res = await fetch("/api/ai/job-post-assist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: newHistory, currentDraft: draft }),
      });
      const data = await res.json();

      if (data.type === "draft" || data.type === "revision") {
        onDraftUpdate({ ...draft, ...data.fields });
        const confirmText = data.text ?? "Here's your job posting draft — does this look right? You can ask me to change anything, or hit Publish when you're happy.";
        const aiMsg: ChatMessage = { role: "assistant", content: confirmText };
        setMessages((prev) => [...(userMessage ? [...prev, { role: "user" as const, content: userMessage }] : prev), aiMsg]);
      } else {
        const aiMsg: ChatMessage = { role: "assistant", content: data.text ?? "..." };
        setMessages((prev) => [...(userMessage ? [...prev, { role: "user" as const, content: userMessage }] : prev), aiMsg]);
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "I'm having a bit of trouble right now. You can switch to the manual form above, or try again." },
      ]);
    } finally {
      setLoading(false);
    }
  }

  async function handleSend() {
    const text = input.trim();
    if (!text || loading) return;
    setInput("");
    await sendToAI(messages, text);
  }

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", borderRight: "1px solid var(--line)", overflow: "hidden" }}>
      <div style={{ flex: 1, overflowY: "auto", padding: "20px 20px 8px" }}>
        {messages.map((m, i) => (
          <div key={i} style={{ display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start", marginBottom: 12 }}>
            {m.role === "assistant" && (
              <div style={{ width: 28, height: 28, borderRadius: "50%", background: "var(--teal-tint)", border: "1px solid var(--teal)/20", display: "flex", alignItems: "center", justifyContent: "center", marginRight: 8, flexShrink: 0, alignSelf: "flex-end" }}>
                <Bot size={13} color="var(--teal-deep)" />
              </div>
            )}
            <div style={{
              maxWidth: "78%",
              padding: "10px 14px",
              borderRadius: m.role === "user" ? "14px 14px 4px 14px" : "14px 14px 14px 4px",
              background: m.role === "user" ? "var(--teal)" : "var(--bg-raised)",
              color: m.role === "user" ? "#fff" : "var(--ink)",
              border: m.role === "assistant" ? "1px solid var(--line)" : "none",
              fontSize: 13.5,
              lineHeight: 1.55,
              whiteSpace: "pre-wrap",
            }}>
              {m.content}
            </div>
          </div>
        ))}
        {loading && (
          <div style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--ink-faint)", fontSize: 13 }}>
            <Loader2 size={13} className="animate-spin" /> Thinking…
          </div>
        )}
        <div ref={bottomRef} />
      </div>
      <div style={{ padding: "12px 16px", borderTop: "1px solid var(--line)", display: "flex", gap: 8 }}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
          placeholder="Type your answer…"
          disabled={loading}
          style={{ flex: 1, height: 40, padding: "0 14px", borderRadius: "var(--radius-control)", border: "1px solid var(--line)", fontSize: 13.5, background: "var(--bg-raised)" }}
        />
        <button
          onClick={handleSend}
          disabled={loading || !input.trim()}
          style={{ width: 40, height: 40, borderRadius: "var(--radius-control)", background: "var(--teal)", color: "#fff", border: "none", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0 }}
        >
          <Send size={15} />
        </button>
      </div>
    </div>
  );
}

// ── Manual Form Panel ─────────────────────────────────────────────────────────
function ManualFormPanel({ draft, onDraftUpdate }: { draft: DraftFields; onDraftUpdate: (d: DraftFields) => void }) {
  function set(field: keyof DraftFields, value: unknown) {
    onDraftUpdate({ ...draft, [field]: value });
  }

  function handleListField(field: "requirements" | "benefits", value: string) {
    // Textarea where each line = one list item.
    const items = value.split("\n").map((l) => l.trim()).filter(Boolean);
    set(field, items);
  }

  const inputStyle = { width: "100%", padding: "9px 12px", borderRadius: "var(--radius-control)", border: "1px solid var(--line)", fontSize: 13.5, background: "var(--bg-raised)", boxSizing: "border-box" as const };
  const labelStyle = { fontSize: 11.5, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase" as const, color: "var(--ink-faint)", display: "block", marginBottom: 5 };

  return (
    <div style={{ flex: 1, overflowY: "auto", borderRight: "1px solid var(--line)", padding: "24px 24px 40px" }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 20, maxWidth: 500 }}>
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
          <textarea style={{ ...inputStyle, minHeight: 100, resize: "vertical" }} value={draft.description ?? ""} onChange={(e) => set("description", e.target.value)} placeholder="What does a typical day look like? What's the practice culture?" />
        </div>

        <div>
          <label style={labelStyle}>Requirements <span style={{ fontWeight: 400, textTransform: "none", letterSpacing: 0 }}>(one per line)</span></label>
          <textarea style={{ ...inputStyle, minHeight: 80, resize: "vertical" }} value={(draft.requirements ?? []).join("\n")} onChange={(e) => handleListField("requirements", e.target.value)} placeholder={"Active RDH license\n2+ years chairside experience\nFamiliar with Dentrix"} />
        </div>

        <div>
          <label style={labelStyle}>Benefits <span style={{ fontWeight: 400, textTransform: "none", letterSpacing: 0 }}>(one per line)</span></label>
          <textarea style={{ ...inputStyle, minHeight: 70, resize: "vertical" }} value={(draft.benefits ?? []).join("\n")} onChange={(e) => handleListField("benefits", e.target.value)} placeholder={"Competitive hourly rate\nFlexible 3-day schedule\nTeam lunches"} />
        </div>

        <div>
          <label style={labelStyle}>This role isn't a fit if…</label>
          <p style={{ fontSize: 12, color: "var(--ink-soft)", marginBottom: 6, lineHeight: 1.5 }}>Be honest — this saves everyone time. Candidates respect upfront clarity.</p>
          <textarea style={{ ...inputStyle, minHeight: 90, resize: "vertical" }} value={draft.not_a_fit_if ?? ""} onChange={(e) => set("not_a_fit_if", e.target.value)} placeholder="This role isn't a fit if you need guaranteed full-time hours from day one, prefer a high-volume production-focused environment, or are still building core chairside confidence." />
        </div>
      </div>
    </div>
  );
}

// ── Live Preview Panel ────────────────────────────────────────────────────────
function PreviewPanel({ draft }: { draft: DraftFields }) {
  const isEmpty = !draft.title && !draft.description;

  return (
    <div style={{ width: 380, flexShrink: 0, overflowY: "auto", padding: "24px 20px", background: "var(--bg)" }}>
      <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--ink-faint)", marginBottom: 14 }}>Preview</p>

      {isEmpty ? (
        <div style={{ border: "1.5px dashed var(--line)", borderRadius: 14, padding: "28px 20px", textAlign: "center", color: "var(--ink-faint)", fontSize: 13.5 }}>
          Your posting preview will appear here as you fill in the details.
        </div>
      ) : (
        <div style={{ border: "1.5px solid var(--teal)/30", borderRadius: 16, padding: "20px", background: "#fff", boxShadow: "0 0 0 3px rgba(45,112,95,0.06)" }}>
          {/* Header */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: "var(--teal-tint)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <span style={{ fontSize: 16 }}>🦷</span>
            </div>
            <div>
              <h2 style={{ fontFamily: "var(--font-serif)", fontSize: 16, fontWeight: 700, margin: 0, lineHeight: 1.2 }}>
                {draft.title || <span style={{ color: "var(--ink-faint)" }}>Job title</span>}
              </h2>
              {(draft.city || draft.state) && (
                <p style={{ fontSize: 12.5, color: "var(--ink-soft)", margin: "2px 0 0" }}>
                  {[draft.city, draft.state].filter(Boolean).join(", ")}
                </p>
              )}
            </div>
          </div>

          {/* Tags */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 12 }}>
            <span style={{ padding: "2px 10px", borderRadius: 999, fontSize: 11, fontWeight: 600, background: "var(--teal)/10", color: "var(--teal)", border: "1px solid var(--teal)/20" }}>✦ On Hdenta</span>
            {draft.employment_type && (
              <span style={{ padding: "2px 10px", borderRadius: 999, fontSize: 11, background: "var(--bg-raised)", color: "var(--ink-soft)", border: "1px solid var(--line)" }}>
                {EMPLOYMENT_TYPE_LABELS[draft.employment_type] ?? draft.employment_type}
              </span>
            )}
            {(draft.pay_min || draft.pay_max) && (
              <span style={{ padding: "2px 10px", borderRadius: 999, fontSize: 11, fontWeight: 700, background: "var(--bg-raised)", color: "var(--teal-deep)", border: "1px solid var(--line)" }}>
                {draft.pay_min && draft.pay_max
                  ? `$${draft.pay_min}–$${draft.pay_max}`
                  : `$${draft.pay_min ?? draft.pay_max}`}
                /{draft.pay_unit === "year" ? "yr" : "hr"}
              </span>
            )}
          </div>

          {draft.description && (
            <p style={{ fontSize: 13.5, lineHeight: 1.6, color: "var(--ink)", marginBottom: 12 }}>{draft.description}</p>
          )}

          {(draft.requirements ?? []).length > 0 && (
            <div style={{ marginBottom: 10 }}>
              <p style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--ink-faint)", marginBottom: 4 }}>Requirements</p>
              <ul style={{ paddingLeft: 18, margin: 0 }}>
                {(draft.requirements ?? []).map((r, i) => <li key={i} style={{ fontSize: 13, marginBottom: 2 }}>{r}</li>)}
              </ul>
            </div>
          )}

          {(draft.benefits ?? []).length > 0 && (
            <div style={{ marginBottom: 10 }}>
              <p style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--ink-faint)", marginBottom: 4 }}>Benefits</p>
              <ul style={{ paddingLeft: 18, margin: 0 }}>
                {(draft.benefits ?? []).map((b, i) => <li key={i} style={{ fontSize: 13, marginBottom: 2 }}>{b}</li>)}
              </ul>
            </div>
          )}

          {draft.not_a_fit_if && (
            <div style={{ borderLeft: "3px solid var(--amber, #f59e0b)", paddingLeft: 10, marginTop: 10 }}>
              <p style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--ink-faint)", marginBottom: 3 }}>This role isn't a fit if…</p>
              <p style={{ fontSize: 13, lineHeight: 1.55, color: "var(--ink-soft)", fontStyle: "italic" }}>{draft.not_a_fit_if}</p>
            </div>
          )}

          <button style={{ width: "100%", marginTop: 14, padding: "10px", borderRadius: "var(--radius-control)", background: "var(--teal)", color: "#fff", fontSize: 13, fontWeight: 700, border: "none", cursor: "default", opacity: 0.7 }}>
            Apply on Hdenta
          </button>
        </div>
      )}
    </div>
  );
}
