"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { MessageSquare } from "lucide-react";

interface ThreadSummary {
  id: string;
  candidate_id: string;
  candidate?: { full_name: string | null; photo_url: string | null; role?: { label: string } };
  created_at: string;
  last_message_preview: string | null;
  last_message_at: string;
  is_unread: boolean;
}

function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "now";
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d`;
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
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
            className={`flex items-center gap-3.5 p-4 rounded-xl border transition-colors ${
              t.is_unread ? "border-teal/40 bg-teal-tint/30" : "border-line bg-bg-raised hover:border-teal"
            }`}
          >
            <div className="relative shrink-0">
              <div className="w-11 h-11 rounded-full bg-gradient-to-br from-teal to-teal-deep flex items-center justify-center text-white font-serif font-semibold overflow-hidden">
                {t.candidate?.photo_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={t.candidate.photo_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  t.candidate?.full_name?.[0] ?? "?"
                )}
              </div>
              {t.is_unread && (
                <span className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full bg-coral border-2 border-bg" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <span className={`text-[14.5px] truncate ${t.is_unread ? "font-bold" : "font-semibold"}`}>
                  {t.candidate?.full_name ?? "Candidate"}
                </span>
                <span className="text-[11.5px] text-ink-faint shrink-0">{timeAgo(t.last_message_at)}</span>
              </div>
              <div className={`text-[13px] truncate ${t.is_unread ? "text-ink font-medium" : "text-ink-faint"}`}>
                {t.last_message_preview ?? t.candidate?.role?.label ?? ""}
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
