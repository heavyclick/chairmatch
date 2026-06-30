"use client";

import { X, Check, Sparkles } from "lucide-react";

interface PricingModalProps {
  open: boolean;
  onClose: () => void;
  onChoosePlan: (kind: "standard" | "pro") => void;
}

const PLANS = [
  {
    kind: "standard" as const,
    name: "Standard",
    price: "$100/yr",
    features: ["Unblur every name & photo", "Direct message any candidate", "Full filter access (already free)", "Interview question packs"],
  },
  {
    kind: "pro" as const,
    name: "Pro",
    price: "$250/yr",
    recommended: true,
    features: ["Everything in Standard", "AI natural-language search", "AI-assisted outreach (review before send)", "AI Hiring Advisor chat", "10 screening credits included"],
  },
];

export function PricingModal({ open, onClose, onChoosePlan }: PricingModalProps) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/50 px-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-lg bg-bg-raised rounded-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 pt-6 pb-2">
          <div>
            <h2 className="font-serif text-xl font-semibold">Unlock to contact</h2>
            <p className="text-[13px] text-ink-faint mt-1">
              See full names, photos, and message candidates directly.
            </p>
          </div>
          <button onClick={onClose} className="text-ink-faint hover:text-ink p-1 shrink-0">
            <X size={18} />
          </button>
        </div>

        <div className="px-6 py-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
          {PLANS.map((plan) => (
            <div
              key={plan.kind}
              className={`relative rounded-2xl border p-5 ${
                plan.recommended ? "border-teal bg-teal-tint/30" : "border-line bg-bg-raised"
              }`}
            >
              {plan.recommended && (
                <span className="absolute -top-2.5 left-4 bg-coral text-white text-[10.5px] font-bold px-2.5 py-1 rounded-full">
                  Recommended
                </span>
              )}
              <div className="flex items-center gap-2 mb-1 mt-1">
                <h3 className="font-serif text-lg font-semibold">{plan.name}</h3>
                {plan.recommended && <Sparkles size={14} className="text-teal-deep" />}
              </div>
              <p className="text-[22px] font-semibold text-teal-deep mb-4">{plan.price}</p>
              <ul className="space-y-2 mb-5">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-[13px] text-ink-soft">
                    <Check size={13} className="text-teal-deep mt-0.5 shrink-0" /> {f}
                  </li>
                ))}
              </ul>
              <button
                onClick={() => onChoosePlan(plan.kind)}
                className="w-full py-2.5 rounded-control text-[13.5px] font-semibold bg-teal text-white hover:bg-teal-deep transition-colors"
              >
                Choose {plan.name}
              </button>
            </div>
          ))}
        </div>

        <p className="text-center text-[12px] text-ink-faint pb-5">
          Annual billing, cancel anytime with one click. No credit card surprises.
        </p>
      </div>
    </div>
  );
}
