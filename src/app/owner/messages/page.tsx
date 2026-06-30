"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { MessageSquare } from "lucide-react";

interface ThreadSummary {
  id: string;
  candidate_id: string;
  candidate?: { full_name: string | null; role?: { label: string } };
  created_at: string;
}

export default function OwnerMessagesPage() {
  const [threads, setThreads] = useState<ThreadSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/messages")
      .then((res) => res.json())
      .then((data) => setThreads(data.threads ?? []))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="max-w-3xl mx-auto px-5 md:px-10 py-7 md:py-12">
      <h1 className="font-serif text-2xl md:text-3xl font-semibold mb-7">Messages</h1>

      {loading && <p className="text-ink-faint text-[14px]">Loading…</p>}

      {!loading && threads.length === 0 && (
        <div className="rounded-xl border border-dashed border-line p-10 text-center">
          <MessageSquare size={22} className="mx-auto text-ink-faint mb-3" />
          <p className="text-[14.5px] font-semibold mb-1">No conversations yet</p>
          <p className="text-[13px] text-ink-faint mb-4">
            Message a candidate from their profile to start a conversation.
          </p>
          <Link href="/owner/browse" className="text-teal-deep font-semibold text-[13.5px]">
            Browse candidates →
          </Link>
        </div>
      )}

      <div className="space-y-2">
        {threads.map((t) => (
          <Link
            key={t.id}
            href={`/owner/messages/${t.id}`}
            className="flex items-center gap-3.5 p-4 rounded-xl border border-line bg-bg-raised hover:border-teal transition-colors"
          >
            <div className="w-11 h-11 rounded-full bg-gradient-to-br from-teal to-teal-deep flex items-center justify-center text-white font-serif font-semibold shrink-0">
              {t.candidate?.full_name?.[0] ?? "?"}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[14.5px] font-semibold">{t.candidate?.full_name ?? "Candidate"}</div>
              <div className="text-[13px] text-ink-faint">{t.candidate?.role?.label}</div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
