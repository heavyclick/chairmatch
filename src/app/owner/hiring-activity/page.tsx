import Link from "next/link";
import { Clock, MessageSquare } from "lucide-react";
import { createClient } from "@/lib/supabase/server";

export default async function HiringActivityPage() {
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getUser();

  let threadCount = 0;
  // PAUSED (AI Pro tier): creditBalance is fetched but no longer
  // displayed anywhere live (see the commented-out card below) -- kept
  // so re-enabling doesn't require re-adding this fetch from scratch.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  let creditBalance = 0;
  let tier = "free";

  if (authData.user) {
    const { count } = await supabase
      .from("message_threads")
      .select("id", { count: "exact", head: true })
      .eq("owner_id", authData.user.id);
    threadCount = count ?? 0;

    const { data: practice } = await supabase
      .from("practice_profiles")
      .select("screening_credit_balance, subscription_tier")
      .eq("id", authData.user.id)
      .maybeSingle();
    creditBalance = practice?.screening_credit_balance ?? 0;
    tier = practice?.subscription_tier ?? "free";
  }

  return (
    <div className="max-w-3xl mx-auto px-5 md:px-10 py-7 md:py-12">
      <h1 className="font-serif text-2xl md:text-3xl font-semibold mb-7">Hiring activity</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-10">
        <div className="rounded-2xl border border-line bg-bg-raised p-5">
          <MessageSquare size={16} className="text-teal-deep mb-2" />
          <div className="font-serif text-2xl font-semibold">{threadCount}</div>
          <div className="text-[12.5px] text-ink-faint">Active conversations</div>
        </div>
        {/* PAUSED (AI Pro tier): this card would always show "-- (Pro
            only)" now that Pro has no live purchase path -- a dead,
            confusing display rather than a real stat. Restore alongside
            re-enabling Pro/screening credits.
        <div className="rounded-2xl border border-line bg-bg-raised p-5">
          <Sparkles size={16} className="text-teal-deep mb-2" />
          <div className="font-serif text-2xl font-semibold">{tier === "pro" ? creditBalance : "--"}</div>
          <div className="text-[12.5px] text-ink-faint">Screening credits {tier !== "pro" && "(Pro only)"}</div>
        </div>
        */}
        <div className="rounded-2xl border border-line bg-bg-raised p-5">
          <Clock size={16} className="text-teal-deep mb-2" />
          <div className="font-serif text-2xl font-semibold capitalize">{tier}</div>
          <div className="text-[12.5px] text-ink-faint">Current plan</div>
        </div>
      </div>

      <div className="rounded-xl border border-dashed border-line p-8 text-center">
        <p className="text-[14px] font-semibold mb-1">Detailed hiring timeline coming soon</p>
        <p className="text-[13px] text-ink-faint mb-4">
          AI search history, screening scorecards, and outreach activity will appear here once those Pro features launch.
        </p>
        <Link href="/owner/messages" className="text-teal-deep font-semibold text-[13.5px]">
          View your conversations →
        </Link>
      </div>
    </div>
  );
}
