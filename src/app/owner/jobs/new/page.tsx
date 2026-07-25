"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Send, Loader2, ArrowLeft, Pencil, Bot, Lightbulb } from "lucide-react";
import { useSubscriptionGate } from "@/components/owner/subscribe-modal";

const DEFAULT_MODE: "ai" | "manual" = "ai";

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
  isSuggestion?: boolean;
  example?: string;
}

const EMPLOYMENT_TYPE_LABELS: Record<string, string> = {
  full_time: "Full-time",
  part_time: "Part-time",
  temp: "Temp / Relief",
  contract: "Contract",
};

export default function NewJobPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"ai" | "manual">(DEFAULT_MODE);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState<DraftFields>({});
  const gate = useSubscriptionGate();

  async function handlePublish(status: "draft" | "active") {
    if (!draft.title?.trim()) {
      setError("Job title is required before publishing.");
      return;
    }
    // Gate check — only for publish, not draft saves
    if (status === "active") {
      const ok = await gate.check();
      if (!ok) return;
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
        if (data.code === "subscription_required") {
          const ok = await gate.check();
          if (!ok) return;
        }
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
      <gate.Modal />

      {/* Top bar */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 24px", borderBottom: "1px solid #e2e8e6", background: "#f8faf9", flexWrap: "wrap", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button onClick={() => router.push("/owner/jobs")} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "#6b7e7a", background: "none", border: "none", cursor: "pointer" }}>
            <ArrowLeft size={14} /> Back
          </button>
          <span style={{ color: "#e2e8e6", fontSize: 18 }}>|</span>
          <h1 style={{ fontSize: 17, fontWeight: 700, margin: 0 }}>New Job Posting</h1>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {mode === "ai" && (
            <button onClick={() => setMode("manual")} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12.5, color: "#6b7e7a", background: "none", border: "1px solid #e2e8e6", borderRadius: 8, padding: "6px 12px", cursor: "pointer" }}>
              <Pencil size={12} /> Fill it in myself
            </button>
          )}
          {mode === "manual" && (
            <button onClick={() => setMode("ai")} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12.5, color: "#2D705F", background: "#e8f4f1", border: "1px solid #b8d9d0", borderRadius: 8, padding: "6px 12px", cursor: "pointer" }}>
              <Bot size={12} /> Switch to AI chat
            </button>
          )}
          <button onClick={() => handlePublish("draft")} disabled={submitting} style={{ fontSize: 13, fontWeight: 600, color: "#6b7e7a", background: "#ffffff", border: "1px solid #e2e8e6", borderRadius: 8, padding: "8px 16px", cursor: "pointer" }}>
            Save draft
          </button>
          <button onClick={() => handlePublish("active")} disabled={submitting} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 700, color: "#ffffff", background: "#2D705F", border: "none", borderRadius: 8, padding: "8px 18px", cursor: "pointer" }}>
            {submitting ? <Loader2 size={13} className="animate-spin" /> : null}
            Publish
          </button>
        </div>
      </div>

      {error && (
        <div style={{ background: "#fff1f0", borderBottom: "1px solid #ffb3ae", color: "#c0392b", fontSize: 13.5, padding: "10px 24px" }}>
          {error}
        </div>
      )}

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

  const sendToAI = useCallback(async (history: ChatMessage[], userMessage?: string) => {
    setLoading(true);
    const apiHistory = history.map(({ role, content }) => ({ role, content }));
    const newApiHistory = userMessage
      ? [...apiHistory, { role: "user" as const, content: userMessage }]
      : apiHistory;

    try {
      const res = await fetch("/api/ai/job-post-assist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: newApiHistory, currentDraft: draft }),
      });
      const data = await res.json();

      const addUserMsg = userMessage
        ? (prev: ChatMessage[]) => [...prev, { role: "user" as const, content: userMessage }]
        : (prev: ChatMessage[]) => prev;

      if (data.type === "draft" || data.type === "revision") {
        onDraftUpdate({ ...draft, ...data.fields });
        const text = data.text ?? "Here's your draft — take a look. I can adjust anything.";
        setMessages((prev) => [...addUserMsg(prev), { role: "assistant", content: text }]);
      } else if (data.type === "suggestion") {
        setMessages((prev) => [...addUserMsg(prev), {
          role: "assistant",
          content: data.text ?? "",
          isSuggestion: true,
          example: data.example,
        }]);
      } else {
        setMessages((prev) => [...addUserMsg(prev), { role: "assistant", content: data.text ?? "..." }]);
      }
    } catch {
      setMessages((prev) => [...(userMessage ? [...prev, { role: "user" as const, content: userMessage }] : prev), {
        role: "assistant",
        content: "I'm having a moment — try again or switch to the manual form if you'd like.",
      }]);
    } finally {
      setLoading(false);
    }
  }, [draft, onDraftUpdate]);

  useEffect(() => {
    if (started) return;
    setStarted(true);
    sendToAI([]);
  }, [started, sendToAI]);

  async function handleSend() {
    const text = input.trim();
    if (!text || loading) return;
    setInput("");
    await sendToAI(messages, text);
  }

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", borderRight: "1px solid #e2e8e6", overflow: "hidden" }}>
      <div style={{ flex: 1, overflowY: "auto", padding: "20px 20px 8px" }}>
        {messages.map((m, i) => (
          <div key={i} style={{ display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start", marginBottom: 12 }}>
            {m.role === "assistant" && (
              <div style={{ width: 28, height: 28, borderRadius: "50%", background: m.isSuggestion ? "#fef9e7" : "#e8f4f1", border: `1px solid ${m.isSuggestion ? "#f7dc6f" : "#b8d9d0"}`, display: "flex", alignItems: "center", justifyContent: "center", marginRight: 8, flexShrink: 0, alignSelf: "flex-start", marginTop: 2 }}>
                {m.isSuggestion ? <Lightbulb size={13} color="#d4a017" /> : <Bot size={13} color="#2D705F" />}
              </div>
            )}
            <div style={{ maxWidth: "78%", display: "flex", flexDirection: "column", gap: 6 }}>
              <div style={{
                padding: "10px 14px",
                borderRadius: m.role === "user" ? "14px 14px 4px 14px" : "14px 14px 14px 4px",
                background: m.role === "user" ? "#2D705F" : m.isSuggestion ? "#fefdf5" : "#ffffff",
                color: m.role === "user" ? "#ffffff" : "#1a2e29",
                border: m.role === "assistant" ? `1px solid ${m.isSuggestion ? "#f7dc6f" : "#e2e8e6"}` : "none",
                fontSize: 13.5,
                lineHeight: 1.55,
                whiteSpace: "pre-wrap" as const,
              }}>
                {m.content}
              </div>
              {/* Example block — shown below the message bubble */}
              {m.example && (
                <div style={{ padding: "8px 12px", borderRadius: 8, background: "#f4f7f6", border: "1px solid #e2e8e6", fontSize: 12.5, color: "#4a6b65", lineHeight: 1.5, fontStyle: "italic" }}>
                  <span style={{ fontStyle: "normal", fontWeight: 700, fontSize: 10.5, textTransform: "uppercase", letterSpacing: "0.05em", color: "#9ab0ac", display: "block", marginBottom: 3 }}>Example</span>
                  {m.example}
                </div>
              )}
            </div>
          </div>
        ))}
        {loading && (
          <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#9ab0ac", fontSize: 13, marginLeft: 36 }}>
            <Loader2 size={13} className="animate-spin" /> Thinking…
          </div>
        )}
        <div ref={bottomRef} />
      </div>
      <div style={{ padding: "12px 16px", borderTop: "1px solid #e2e8e6", display: "flex", gap: 8 }}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
          placeholder="Type your answer…"
          disabled={loading}
          style={{ flex: 1, height: 40, padding: "0 14px", borderRadius: 8, border: "1px solid #e2e8e6", fontSize: 13.5, background: "#ffffff" }}
        />
        <button
          onClick={handleSend}
          disabled={loading || !input.trim()}
          style={{ width: 40, height: 40, borderRadius: 8, background: "#2D705F", color: "#ffffff", border: "none", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0, opacity: loading || !input.trim() ? 0.5 : 1 }}
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
    set(field, value.split("\n").map((l) => l.trim()).filter(Boolean));
  }
  const inputStyle: React.CSSProperties = { width: "100%", padding: "9px 12px", borderRadius: 8, border: "1px solid #e2e8e6", fontSize: 13.5, background: "#ffffff", boxSizing: "border-box" };
  const labelStyle: React.CSSProperties = { fontSize: 11.5, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: "#8fa8a3", display: "block", marginBottom: 5 };

  return (
    <div style={{ flex: 1, overflowY: "auto", borderRight: "1px solid #e2e8e6", padding: "24px 24px 40px" }}>
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
          <p style={{ fontSize: 12, color: "#8fa8a3", marginBottom: 6, lineHeight: 1.5 }}>Be honest — this saves everyone time.</p>
          <textarea style={{ ...inputStyle, minHeight: 90, resize: "vertical" }} value={draft.not_a_fit_if ?? ""} onChange={(e) => set("not_a_fit_if", e.target.value)} placeholder="This role isn't a fit if you need guaranteed full-time hours from day one, prefer a high-volume production-focused environment…" />
        </div>
      </div>
    </div>
  );
}

// ── Live Preview Panel ────────────────────────────────────────────────────────
function PreviewPanel({ draft }: { draft: DraftFields }) {
  const isEmpty = !draft.title && !draft.description;
  return (
    <div style={{ width: 380, flexShrink: 0, overflowY: "auto", padding: "24px 20px", background: "#f8faf9" }}>
      <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#9ab0ac", marginBottom: 14 }}>Preview</p>
      {isEmpty ? (
        <div style={{ border: "1.5px dashed #d4e4e0", borderRadius: 14, padding: "28px 20px", textAlign: "center", color: "#9ab0ac", fontSize: 13.5 }}>
          Your posting preview will appear here as you fill in the details.
        </div>
      ) : (
        <div style={{ border: "1.5px solid #b8d9d0", borderRadius: 16, padding: "20px", background: "#ffffff", boxShadow: "0 0 0 3px rgba(45,112,95,0.06)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: "#e8f4f1", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <span style={{ fontSize: 16 }}>🦷</span>
            </div>
            <div>
              <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0, lineHeight: 1.2, color: "#1a2e29" }}>{draft.title || <span style={{ color: "#9ab0ac" }}>Job title</span>}</h2>
              {(draft.city || draft.state) && <p style={{ fontSize: 12.5, color: "#6b7e7a", margin: "2px 0 0" }}>{[draft.city, draft.state].filter(Boolean).join(", ")}</p>}
            </div>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 12 }}>
            <span style={{ padding: "2px 10px", borderRadius: 999, fontSize: 11, fontWeight: 600, background: "#e8f4f1", color: "#2D705F", border: "1px solid #b8d9d0" }}>✦ On Hdenta</span>
            {draft.employment_type && <span style={{ padding: "2px 10px", borderRadius: 999, fontSize: 11, background: "#f4f7f6", color: "#6b7e7a", border: "1px solid #e2e8e6" }}>{EMPLOYMENT_TYPE_LABELS[draft.employment_type] ?? draft.employment_type}</span>}
            {(draft.pay_min || draft.pay_max) && <span style={{ padding: "2px 10px", borderRadius: 999, fontSize: 11, fontWeight: 700, background: "#f4f7f6", color: "#2D705F", border: "1px solid #e2e8e6" }}>{draft.pay_min && draft.pay_max ? `$${draft.pay_min}–$${draft.pay_max}` : `$${draft.pay_min ?? draft.pay_max}`}/{draft.pay_unit === "year" ? "yr" : "hr"}</span>}
          </div>
          {draft.description && <p style={{ fontSize: 13.5, lineHeight: 1.6, color: "#1a2e29", marginBottom: 12 }}>{draft.description}</p>}
          {(draft.requirements ?? []).length > 0 && (
            <div style={{ marginBottom: 10 }}>
              <p style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "#9ab0ac", marginBottom: 4 }}>Requirements</p>
              <ul style={{ paddingLeft: 18, margin: 0 }}>{(draft.requirements ?? []).map((r, i) => <li key={i} style={{ fontSize: 13, marginBottom: 2, color: "#1a2e29" }}>{r}</li>)}</ul>
            </div>
          )}
          {(draft.benefits ?? []).length > 0 && (
            <div style={{ marginBottom: 10 }}>
              <p style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "#9ab0ac", marginBottom: 4 }}>Benefits</p>
              <ul style={{ paddingLeft: 18, margin: 0 }}>{(draft.benefits ?? []).map((b, i) => <li key={i} style={{ fontSize: 13, marginBottom: 2, color: "#1a2e29" }}>{b}</li>)}</ul>
            </div>
          )}
          {draft.not_a_fit_if && (
            <div style={{ borderLeft: "3px solid #f59e0b", paddingLeft: 10, marginTop: 10 }}>
              <p style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "#9ab0ac", marginBottom: 3 }}>This role isn't a fit if…</p>
              <p style={{ fontSize: 13, lineHeight: 1.55, color: "#6b7e7a", fontStyle: "italic" }}>{draft.not_a_fit_if}</p>
            </div>
          )}
          <button style={{ width: "100%", marginTop: 14, padding: "10px", borderRadius: 8, background: "#2D705F", color: "#ffffff", fontSize: 13, fontWeight: 700, border: "none", cursor: "default", opacity: 0.7 }}>Apply on Hdenta</button>
        </div>
      )}
    </div>
  );
}
