"use client";

import Link from "next/link";
import { Sparkles, MessageSquare, Search, ArrowRight } from "lucide-react";

export default function AiToolsPage() {
  return (
    <div className="max-w-2xl mx-auto px-5 md:px-10 py-7 md:py-12">
      <h1 className="font-serif text-2xl md:text-3xl font-semibold mb-2 flex items-center gap-2">
        <Sparkles size={22} className="text-teal-deep" /> AI Tools
      </h1>
      <p className="text-[14px] text-ink-faint mb-8">
        AI-assisted tools are paused for now while we focus on the core experience -- here&apos;s
        what&apos;s planned for a future Pro plan, and what&apos;s already live for everyone today.
      </p>

      <div className="space-y-3">
        <div className="rounded-xl border border-line bg-bg-raised p-4">
          <div className="flex items-center gap-2 mb-1">
            <MessageSquare size={15} className="text-teal-deep" />
            <span className="text-[14.5px] font-semibold">AI Screening</span>
            <span className="text-[10.5px] font-semibold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">
              Coming soon
            </span>
          </div>
          <p className="text-[13px] text-ink-faint">
            Send a candidate an AI-led screening conversation before you talk to them yourself.
            The credit and consent system is in place; the actual screening flow is still being
            built.
          </p>
        </div>

        <Link
          href="/owner/browse"
          className="block rounded-xl border border-line bg-bg-raised p-4 hover:border-teal transition-colors"
        >
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <Search size={15} className="text-teal-deep" />
              <span className="text-[14.5px] font-semibold">Browse with filters</span>
            </div>
            <ArrowRight size={14} className="text-ink-faint" />
          </div>
          <p className="text-[13px] text-ink-faint">
            Full filter access is available to every plan today. A dedicated AI natural-language
            search (&quot;find me a bilingual hygienist open to weekends&quot;) isn&apos;t built yet -- this
            links to the regular filter-based browse for now.
          </p>
        </Link>

        <div className="rounded-xl border border-line bg-bg-raised p-4">
          <div className="flex items-center gap-2 mb-1">
            <Sparkles size={15} className="text-teal-deep" />
            <span className="text-[14.5px] font-semibold">AI-generated candidate highlights</span>
            <span className="text-[10.5px] font-semibold text-teal-deep bg-teal-tint px-2 py-0.5 rounded-full">
              Live
            </span>
          </div>
          <p className="text-[13px] text-ink-faint">
            Already working -- every candidate profile and browse card shows AI-synthesized
            standout chips based on their skills, software, and experience.
          </p>
        </div>
      </div>
    </div>
  );
}
