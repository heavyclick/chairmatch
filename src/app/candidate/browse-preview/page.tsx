"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Eye } from "lucide-react";
import { PreviewCandidateCard } from "@/components/candidate/preview-candidate-card";
import type { CandidateProfile, BlurredCandidateProfile } from "@/types/database";

export default function CandidateBrowsePreviewPage() {
  const [results, setResults] = useState<(CandidateProfile | BlurredCandidateProfile)[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/candidate/browse-preview")
      .then((res) => res.json())
      .then((data) => setResults(data.results ?? []))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="max-w-5xl mx-auto px-5 md:px-10 py-7 md:py-12">
      <Link href="/candidate/dashboard" className="flex items-center gap-1.5 text-[13px] text-ink-faint hover:text-ink mb-6">
        <ArrowLeft size={14} /> Back to dashboard
      </Link>

      <div className="flex items-center gap-2.5 mb-2">
        <Eye size={20} className="text-teal-deep" />
        <h1 className="font-serif text-2xl md:text-3xl font-semibold">See it from their side</h1>
      </div>
      <p className="text-[14px] text-ink-faint mb-8 max-w-xl">
        This is what practices see when they browse candidates -- most profiles blurred until unlocked,
        with a few left visible here so you get a feel for it. (These are other candidates&apos; profiles,
        randomly sampled -- nothing here reflects who&apos;s actually unlocked you specifically.)
      </p>

      {loading && <p className="text-ink-faint text-[14px]">Loading…</p>}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {results.map((c) => (
          <PreviewCandidateCard key={c.id} candidate={c} />
        ))}
      </div>
    </div>
  );
}
