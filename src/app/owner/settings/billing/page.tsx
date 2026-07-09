"use client";

import { useEffect, useState, useCallback, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Check, Sparkles, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

const PLANS: {
  kind: "standard" | "pro";
  name: string;
  price: string;
  features: string[];
  highlight?: boolean;
}[] = [
  {
    kind: "standard",
    name: "Standard",
    price: "$100/yr",
    features: ["Unblur every name & photo", "Direct message any candidate", "Full filter access (already free)", "Interview question packs"],
  },
  // PAUSED (AI Pro tier) -- re-enable when AI Search/Advisor/Screening
  // ship for real. See src/app/api/checkout/route.ts and
  // src/lib/dodo/apply-entitlement.ts for the matching paused backend
  // logic that needs uncommenting alongside this.
  // {
  //   kind: "pro" as const,
  //   name: "Pro",
  //   price: "$250/yr",
  //   features: ["Everything in Standard", "AI natural-language search", "AI-assisted outreach (review before send)", "AI Hiring Advisor chat", "10 screening credits included"],
  //   highlight: true,
  // },
];

const IS_DEV = process.env.NODE_ENV !== "production";

export default function BillingPage() {
  return (
    <Suspense fallback={<div className="max-w-2xl mx-auto px-5 md:px-10 py-7 md:py-12 text-ink-faint text-[14px]">Loading…</div>}>
      <BillingPageInner />
    </Suspense>
  );
}

function BillingPageInner() {
  const [tier, setTier] = useState<string>("free");
  const [credits, setCredits] = useState(0);
  const [loadingKind, setLoadingKind] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);

  const searchParams = useSearchParams();
  const router = useRouter();

  const fetchPlan = useCallback(async () => {
    const supabase = createClient();
    const { data } = await supabase.auth.getUser();
    if (!data.user) return null;
    const { data: practice } = await supabase
      .from("practice_profiles")
      .select("subscription_tier, screening_credit_balance")
      .eq("id", data.user.id)
      .single();
    if (practice) {
      setTier(practice.subscription_tier);
      setCredits(practice.screening_credit_balance);
    }
    return practice;
  }, []);

  // These two effects sync component state from an external source (the
  // DB on mount, and the URL's ?success= param after a checkout redirect)
  // -- the exact case the rule's own docs carve out as fine ("calling
  // setState in a callback function when external state changes"). The
  // static analyzer can't see through fetchPlan()'s indirection to know
  // that, hence the explicit disables rather than restructuring working
  // code to dodge a false positive.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchPlan();
  }, [fetchPlan]);

  // Checkout redirects back here with ?success=true the moment Dodo
  // confirms the charge on their end -- but the webhook that actually
  // writes subscription_tier to our DB can land a beat after that
  // redirect happens. A single fetch-on-mount can race it and show the
  // old "free" tier even though the payment genuinely went through, which
  // is exactly what was happening before. Poll briefly instead of trusting
  // one read.
  useEffect(() => {
    if (searchParams.get("success") !== "true") return;

    // eslint-disable-next-line react-hooks/set-state-in-effect -- see justification above
    setConfirming(true);
    const startingTier = tier;
    let attempts = 0;
    const maxAttempts = 10; // ~15s at 1.5s intervals -- webhooks normally land in well under that

    const interval = setInterval(async () => {
      attempts += 1;
      const practice = await fetchPlan();
      const changed = practice && practice.subscription_tier !== startingTier;
      if (changed || attempts >= maxAttempts) {
        clearInterval(interval);
        setConfirming(false);
        // Drop ?success=true from the URL so refreshing doesn't re-poll
        router.replace("/owner/settings/billing");
      }
    }, 1500);

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

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

  async function devUnlock(kind: string) {
    setLoadingKind(kind);
    try {
      const res = await fetch("/api/dev/unlock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        alert(data.error || "Dev unlock failed.");
        return;
      }
      await fetchPlan();
    } finally {
      setLoadingKind(null);
    }
  }

  return (
    <div className="max-w-2xl mx-auto px-5 md:px-10 py-7 md:py-12">
      <h1 className="font-serif text-2xl md:text-3xl font-semibold mb-2">Billing & plan</h1>
      <p className="text-[14px] text-ink-faint mb-2">
        Current plan: <span className="font-semibold capitalize text-ink">{tier}</span>
        {/* PAUSED (AI Pro tier / screening credits) -- restore when Pro ships:
        {tier === "pro" && <span className="ml-2">· {credits} screening credits</span>}
        */}
      </p>

      {confirming && (
        <p className="flex items-center gap-1.5 text-[13px] text-teal-deep mb-6">
          <Loader2 size={13} className="animate-spin" /> Confirming your payment…
        </p>
      )}

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

      {/* PAUSED (AI Pro tier / screening credits) -- re-enable alongside
          the Pro plan entry above once AI Screening ships for real.
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
      */}

      {IS_DEV && (
        <div className="mt-12 rounded-xl border border-dashed border-amber-400 bg-amber-50 p-4">
          <p className="text-[12.5px] font-semibold text-amber-800 mb-1">Dev tools (hidden in production)</p>
          <p className="text-[12px] text-amber-700 mb-3">
            Dodo can&apos;t reach localhost to fire its webhook, so real checkout won&apos;t unlock anything
            here. These buttons call the same entitlement logic the webhook does, directly, so you can test
            the unlock UI without a tunnel. This whole panel — and the <code>/api/dev/unlock</code> route
            it calls — 404s automatically the moment <code>NODE_ENV</code> is <code>production</code>.
          </p>
          <div className="flex flex-wrap gap-2">
            {/* PAUSED (AI Pro tier): "pro", "credits_10", "credits_25" removed from
                this list -- there's no live purchase path for them anymore, so a
                dev grant of "pro" would put the account in a state no real user
                can reach. Restore ["standard", "pro", "credits_10", "credits_25"]
                when the Pro tier is re-enabled. */}
            {(["standard"] as const).map((k) => (
              <button
                key={k}
                onClick={() => devUnlock(k)}
                disabled={loadingKind === k}
                className="px-3 py-1.5 rounded-md border border-amber-400 bg-white text-[12px] font-medium text-amber-800 hover:bg-amber-100"
              >
                {loadingKind === k ? "Applying…" : `Grant: ${k}`}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
