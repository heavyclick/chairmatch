"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export default function OwnerSettingsPage() {
  const [practice, setPractice] = useState<{
    practice_name: string;
    subscription_tier: string;
    culture_text: string | null;
  } | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) return;
      const { data: p } = await supabase
        .from("practice_profiles")
        .select("practice_name, subscription_tier, culture_text")
        .eq("id", data.user.id)
        .single();
      setPractice(p);
    });
  }, []);

  return (
    <div className="max-w-xl mx-auto px-5 md:px-10 py-7 md:py-12">
      <h1 className="font-serif text-2xl md:text-3xl font-semibold mb-7">Practice Profile</h1>

      <div className="rounded-2xl border border-line bg-bg-raised p-5 mb-5">
        <p className="text-[13px] font-semibold text-ink-soft mb-1">Practice name</p>
        <p className="text-[15px] mb-4">{practice?.practice_name ?? "—"}</p>

        <p className="text-[13px] font-semibold text-ink-soft mb-1">Plan</p>
        <p className="text-[15px] capitalize mb-4">{practice?.subscription_tier ?? "free"}</p>

        <p className="text-[13px] font-semibold text-ink-soft mb-1">Culture description</p>
        <p className="text-[14px] text-ink-soft leading-relaxed">
          {practice?.culture_text ?? "Not set yet."}
        </p>
      </div>

      <Link
        href="/onboarding/owner"
        className="flex items-center justify-between rounded-xl border border-line p-4 hover:border-teal transition-colors mb-3"
      >
        <span className="text-[14px] font-semibold">Edit practice details</span>
        <ArrowRight size={15} className="text-ink-faint" />
      </Link>

      <Link
        href="/owner/settings/billing"
        className="flex items-center justify-between rounded-xl border border-line p-4 hover:border-teal transition-colors"
      >
        <span className="text-[14px] font-semibold">Billing & plan</span>
        <ArrowRight size={15} className="text-ink-faint" />
      </Link>
    </div>
  );
}
