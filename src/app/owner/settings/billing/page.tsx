"use client";

import { useEffect, useState } from "react";
import { Check, Sparkles } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

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
    features: ["Everything in Standard", "AI natural-language search", "AI-assisted outreach (review before send)", "AI Hiring Advisor chat", "10 screening credits included"],
    highlight: true,
  },
];

export default function BillingPage() {
  const [tier, setTier] = useState<string>("free");
  const [credits, setCredits] = useState(0);
  const [loadingKind, setLoadingKind] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) return;
      const { data: practice } = await supabase
        .from("practice_profiles")
        .select("subscription_tier, screening_credit_balance")
        .eq("id", data.user.id)
        .single();
      if (practice) {
        setTier(practice.subscription_tier);
        setCredits(practice.screening_credit_balance);
      }
    });
  }, []);

  async function checkout(kind: string) {
    setLoadingKind(kind);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        alert(data.error || "Couldn't start checkout.");
      }
    } finally {
      setLoadingKind(null);
    }
  }

  return (
    <div className="max-w-2xl mx-auto px-5 md:px-10 py-7 md:py-12">
      <h1 className="font-serif text-2xl md:text-3xl font-semibold mb-2">Billing & plan</h1>
      <p className="text-[14px] text-ink-faint mb-8">
        Current plan: <span className="font-semibold capitalize text-ink">{tier}</span>
        {tier === "pro" && <span className="ml-2">· {credits} screening credits</span>}
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-10">
        {PLANS.map((plan) => (
          <div
            key={plan.kind}
            className={`relative rounded-2xl border p-5 ${
              plan.highlight ? "border-teal bg-teal-tint/30" : "border-line bg-bg-raised"
            }`}
          >
            {plan.highlight && (
              <span className="absolute -top-2.5 left-4 bg-coral text-white text-[10.5px] font-bold px-2.5 py-1 rounded-full">
                Recommended
              </span>
            )}
            <div className="flex items-center gap-2 mb-1 mt-1">
              <h3 className="font-serif text-lg font-semibold">{plan.name}</h3>
              {plan.highlight && <Sparkles size={14} className="text-teal-deep" />}
            </div>
            <p className="text-[22px] font-semibold text-teal-deep mb-4">{plan.price}</p>
            <ul className="space-y-2 mb-5">
              {plan.features.map((f) => (
                <li key={f} className="flex items-start gap-2 text-[13.5px] text-ink-soft">
                  <Check size={14} className="text-teal-deep mt-0.5 shrink-0" /> {f}
                </li>
              ))}
            </ul>
            <button
              onClick={() => checkout(plan.kind)}
              disabled={loadingKind === plan.kind || tier === plan.kind}
              className={`w-full py-2.5 rounded-control text-[13.5px] font-semibold transition-colors ${
                tier === plan.kind
                  ? "bg-line text-ink-faint cursor-default"
                  : "bg-teal text-white hover:bg-teal-deep"
              }`}
            >
              {tier === plan.kind ? "Current plan" : loadingKind === plan.kind ? "Redirecting…" : `Choose ${plan.name}`}
            </button>
          </div>
        ))}
      </div>

      {tier === "pro" && (
        <>
          <h2 className="text-[15px] font-semibold mb-3">Screening credits</h2>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => checkout("credits_10")}
              disabled={loadingKind === "credits_10"}
              className="rounded-xl border border-line p-4 text-left hover:border-teal transition-colors"
            >
              <p className="text-[14px] font-semibold">10 credits</p>
              <p className="text-[13px] text-ink-faint">$45</p>
            </button>
            <button
              onClick={() => checkout("credits_25")}
              disabled={loadingKind === "credits_25"}
              className="rounded-xl border border-line p-4 text-left hover:border-teal transition-colors"
            >
              <p className="text-[14px] font-semibold">25 credits</p>
              <p className="text-[13px] text-ink-faint">$100</p>
            </button>
          </div>
        </>
      )}
    </div>
  );
}
