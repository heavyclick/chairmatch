"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, X, CheckCircle, ExternalLink } from "lucide-react";

interface PostJobButtonProps {
  hasSubscription: boolean;
  checkoutUrl: string | null;
  variant?: "default" | "cta";
}

export function PostJobButton({ hasSubscription, checkoutUrl, variant = "default" }: PostJobButtonProps) {
  const [showModal, setShowModal] = useState(false);
  const router = useRouter();

  function handleClick() {
    if (hasSubscription) {
      router.push("/owner/jobs/new");
    } else {
      setShowModal(true);
    }
  }

  const buttonStyle = variant === "cta"
    ? { display: "inline-flex", alignItems: "center", gap: 7, background: "var(--teal)", color: "#fff", fontSize: 14, fontWeight: 700, padding: "11px 22px", borderRadius: "var(--radius-control)", border: "none", cursor: "pointer" }
    : { display: "inline-flex", alignItems: "center", gap: 7, background: "var(--teal)", color: "#fff", fontSize: 13.5, fontWeight: 600, padding: "10px 18px", borderRadius: "var(--radius-control)", border: "none", cursor: "pointer" };

  return (
    <>
      <button onClick={handleClick} style={buttonStyle}>
        <Plus size={variant === "cta" ? 16 : 15} />
        Post a Job
      </button>

      {/* Subscribe modal */}
      {showModal && (
        <div
          onClick={(e) => { if (e.target === e.currentTarget) setShowModal(false); }}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)", zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}
        >
          <div style={{ background: "#fff", borderRadius: 20, padding: "32px 28px", maxWidth: 420, width: "100%", position: "relative" }}>
            <button
              onClick={() => setShowModal(false)}
              style={{ position: "absolute", top: 16, right: 16, width: 28, height: 28, borderRadius: "50%", border: "1px solid var(--line)", background: "none", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "var(--ink-soft)" }}
            >
              <X size={13} />
            </button>

            <div style={{ width: 48, height: 48, borderRadius: 12, background: "var(--teal-tint)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
              <span style={{ fontSize: 22 }}>💼</span>
            </div>

            <h2 style={{ fontFamily: "var(--font-serif)", fontSize: 20, fontWeight: 700, marginBottom: 8 }}>
              Unlock Job Postings
            </h2>
            <p style={{ fontSize: 14, color: "var(--ink-soft)", lineHeight: 1.65, marginBottom: 20 }}>
              Post unlimited job openings and receive in-platform applications from dental candidates for $50/month.
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 24 }}>
              {[
                "Unlimited job postings",
                "AI-assisted job post drafting",
                "In-platform candidate applications",
                "Applicant inbox with messaging",
              ].map((f) => (
                <div key={f} style={{ display: "flex", alignItems: "center", gap: 9, fontSize: 13.5 }}>
                  <CheckCircle size={14} color="var(--teal)" style={{ flexShrink: 0 }} />
                  <span>{f}</span>
                </div>
              ))}
            </div>

            <a
              href={checkoutUrl ?? "#"}
              style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 7, width: "100%", padding: "13px 0", background: "var(--teal)", color: "#fff", fontSize: 14, fontWeight: 700, borderRadius: "var(--radius-control)", textDecoration: "none", boxSizing: "border-box" }}
            >
              Subscribe — $50/month <ExternalLink size={13} />
            </a>

            <p style={{ textAlign: "center", fontSize: 12, color: "var(--ink-faint)", marginTop: 12 }}>
              Cancel any time. 14-day money-back guarantee.
            </p>
          </div>
        </div>
      )}
    </>
  );
}
