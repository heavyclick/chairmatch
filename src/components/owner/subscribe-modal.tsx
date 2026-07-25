"use client";

/**
 * SubscribeModal + useSubscriptionGate hook
 *
 * Single source of truth for the job posting subscription gate.
 * Used in: /owner/jobs/new, /owner/jobs/[id], /owner/jobs/[id]/edit
 *
 * Usage:
 *   const gate = useSubscriptionGate();
 *   // Before any action that requires subscription:
 *   const ok = await gate.check();
 *   if (!ok) return; // modal is now showing
 *   // proceed with action
 *
 *   // In JSX:
 *   <gate.Modal />
 */

import { useState, useCallback } from "react";
import { ExternalLink, CheckCircle } from "lucide-react";

interface GateResult {
  check: () => Promise<boolean>;
  Modal: () => React.ReactElement | null;
}

export function useSubscriptionGate(): GateResult {
  const [show, setShow] = useState(false);
  const [checkoutUrl, setCheckoutUrl] = useState("");

  const check = useCallback(async (): Promise<boolean> => {
    try {
      const res = await fetch("/api/owner/subscription-status");
      const data = await res.json();
      if (data.hasJobPostingSubscription) return true;
      setCheckoutUrl(data.checkoutUrl ?? "");
      setShow(true);
      return false;
    } catch {
      // On network error, optimistically allow — the API will re-check
      return true;
    }
  }, []);

  const Modal = useCallback((): React.ReactElement | null => {
    if (!show) return null;
    return (
      <div
        onClick={(e) => { if (e.target === e.currentTarget) setShow(false); }}
        style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", backdropFilter: "blur(4px)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}
      >
        <div style={{ background: "#ffffff", borderRadius: 20, padding: "32px 28px", maxWidth: 420, width: "100%", position: "relative", boxShadow: "0 20px 60px rgba(0,0,0,0.2)" }}>
          <button
            onClick={() => setShow(false)}
            style={{ position: "absolute", top: 14, right: 14, width: 28, height: 28, borderRadius: "50%", border: "1px solid #e2e8e6", background: "#f8faf9", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", fontSize: 16, color: "#6b7e7a", lineHeight: 1 }}
          >
            ✕
          </button>

          <div style={{ width: 48, height: 48, borderRadius: 12, background: "#e8f4f1", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
            <span style={{ fontSize: 22 }}>💼</span>
          </div>

          <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8, color: "#1a2e29" }}>
            Subscription required
          </h2>
          <p style={{ fontSize: 14, color: "#5a7570", lineHeight: 1.65, marginBottom: 20 }}>
            Subscribe for $50/month to publish job postings and receive in-platform applications from dental candidates.
          </p>

          <div style={{ display: "flex", flexDirection: "column", gap: 9, marginBottom: 24 }}>
            {[
              "Unlimited job postings",
              "AI-assisted job post drafting",
              "In-platform candidate applications",
              "Applicant inbox with messaging",
            ].map((f) => (
              <div key={f} style={{ display: "flex", alignItems: "center", gap: 9, fontSize: 13.5, color: "#1a2e29" }}>
                <CheckCircle size={15} color="#2D705F" style={{ flexShrink: 0 }} />
                {f}
              </div>
            ))}
          </div>

          <a
            href={checkoutUrl || "#"}
            style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 7, width: "100%", padding: "13px 0", background: "#2D705F", color: "#ffffff", fontSize: 14, fontWeight: 700, borderRadius: 10, textDecoration: "none", boxSizing: "border-box" as const }}
          >
            Subscribe — $50/month <ExternalLink size={13} color="#ffffff" />
          </a>

          <p style={{ textAlign: "center", fontSize: 12, color: "#8fa8a3", marginTop: 12 }}>
            Cancel any time · 14-day money-back guarantee
          </p>
        </div>
      </div>
    );
  }, [show, checkoutUrl]);

  return { check, Modal };
}
