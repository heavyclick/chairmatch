"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Send, Sparkles, User } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { PricingModal } from "@/components/shared/pricing-modal";

interface Message {
  id: string;
  sender_id: string;
  body: string;
  ai_drafted: boolean;
  sent_at: string;
}

interface OtherParty {
  name: string;
  photoUrl: string | null;
  subtitle: string | null;
}

const STARTER_PROMPTS = [
  "Hi! I'd love to learn more about your background.",
  "Are you still open to new opportunities?",
  "What are you looking for in your next role?",
];

/**
 * Props: exactly one of `threadId` (an existing conversation) or
 * `candidateId` (owner starting a brand-new conversation, no thread
 * exists yet) should be provided.
 *
 * Previously this always auto-sent a hardcoded first message the
 * instant "Message" was clicked, with no header showing who you were
 * even talking to. Now: shows the other party's name/role/photo at
 * the top, starts with an empty compose box, and offers tappable
 * (never auto-sent) starter suggestions only for a brand-new thread.
 */
export function MessageThread({
  threadId: initialThreadId,
  candidateId,
  backHref,
}: {
  threadId?: string;
  candidateId?: string;
  backHref: string;
}) {
  const router = useRouter();
  const [threadId, setThreadId] = useState<string | undefined>(initialThreadId);
  const [otherParty, setOtherParty] = useState<OtherParty | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [sendError, setSendError] = useState<string | null>(null);
  const [pricingOpen, setPricingOpen] = useState(false);
  const [checkingOut, setCheckingOut] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  async function handleChoosePlan(kind: "standard" | "pro") {
    setCheckingOut(true);
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
        setCheckingOut(false);
      }
    } catch {
      alert("Couldn't reach the server.");
      setCheckingOut(false);
    }
  }

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => setCurrentUserId(data.user?.id ?? null));
  }, []);

  useEffect(() => {
    if (threadId) {
      fetch(`/api/messages?thread_id=${threadId}`)
        .then((res) => res.json())
        .then((data) => {
          setMessages(data.messages ?? []);
          setOtherParty(data.otherParty ?? null);
        })
        .finally(() => setLoading(false));
    } else if (candidateId) {
      // Brand-new conversation -- no thread exists yet, so there's
      // nothing to fetch from /api/messages. Pull the candidate's
      // header info (name/role/photo) from the same endpoint the
      // candidate detail page already uses.
      fetch(`/api/candidate/${candidateId}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.candidate) {
            setOtherParty({
              name: data.candidate.full_name,
              photoUrl: data.candidate.photo_url,
              subtitle: data.candidate.role?.label ?? null,
            });
          }
        })
        .finally(() => setLoading(false));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentionally only re-runs when the identity of the conversation changes
  }, [threadId, candidateId]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  async function send() {
    if (!input.trim()) return;
    setSending(true);
    setSendError(null);
    try {
      const res = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          threadId ? { threadId, body: input.trim() } : { candidateId, body: input.trim() }
        ),
      });
      const data = await res.json();
      if (res.ok) {
        setMessages((m) => [...m, data.message]);
        setInput("");
        if (!threadId && data.threadId) {
          // First message of a new conversation just created the
          // thread -- swap into normal existing-thread mode (and
          // update the URL) so replies work exactly like any other
          // conversation from here on.
          setThreadId(data.threadId);
          router.replace(`${backHref}/${data.threadId}`);
        }
      } else if (res.status === 402 && data.requiresUpgrade) {
        setPricingOpen(true);
      } else {
        setSendError(data.error || "Couldn't send that. Please try again.");
      }
    } catch {
      setSendError("Couldn't reach the server. Please try again.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto px-5 md:px-0 py-7 md:py-12 flex flex-col h-[calc(100vh-100px)] md:h-[calc(100vh-60px)]">
      <button
        onClick={() => router.push(backHref)}
        className="flex items-center gap-1.5 text-[13px] text-ink-faint hover:text-ink mb-4 shrink-0"
      >
        <ArrowLeft size={14} /> Back to messages
      </button>

      {otherParty && (
        <div className="flex items-center gap-3 pb-4 mb-4 border-b border-line shrink-0">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-teal to-teal-deep flex items-center justify-center overflow-hidden shrink-0">
            {otherParty.photoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={otherParty.photoUrl} alt={otherParty.name} className="w-full h-full object-cover" />
            ) : (
              <User size={16} className="text-white" />
            )}
          </div>
          <div className="min-w-0">
            <p className="text-[14.5px] font-semibold truncate">{otherParty.name}</p>
            {otherParty.subtitle && <p className="text-[12.5px] text-ink-faint truncate">{otherParty.subtitle}</p>}
          </div>
        </div>
      )}

      <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-3 mb-4">
        {loading && <p className="text-ink-faint text-[14px]">Loading…</p>}
        {!loading && messages.length === 0 && (
          <p className="text-ink-faint text-[14px] text-center py-10">
            No messages yet. Say hello below.
          </p>
        )}
        {messages.map((m) => {
          const isMine = m.sender_id === currentUserId;
          return (
            <div key={m.id} className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-[14px] ${
                  isMine ? "bg-teal text-white" : "bg-line-soft text-ink"
                }`}
              >
                {m.ai_drafted && (
                  <span className="flex items-center gap-1 text-[10.5px] opacity-75 mb-1">
                    <Sparkles size={10} /> AI-drafted
                  </span>
                )}
                {m.body}
              </div>
            </div>
          );
        })}
      </div>

      {!loading && messages.length === 0 && (
        <div className="flex flex-wrap gap-2 mb-3 shrink-0">
          {STARTER_PROMPTS.map((prompt) => (
            <button
              key={prompt}
              onClick={() => setInput(prompt)}
              className="text-[12.5px] px-3 py-1.5 rounded-full border border-line text-ink-soft hover:border-teal hover:text-teal-deep transition-colors"
            >
              {prompt}
            </button>
          ))}
        </div>
      )}

      {sendError && <p className="text-[12.5px] text-coral-deep mb-2 shrink-0">{sendError}</p>}

      <div className="flex items-center gap-2.5 shrink-0">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
          placeholder="Write a message…"
          className="flex-1 px-4 py-3 rounded-control border border-line bg-bg-raised text-[14px] outline-none focus:border-teal"
        />
        <button
          onClick={send}
          disabled={sending || !input.trim()}
          className="w-12 h-12 rounded-control bg-teal disabled:bg-line text-white flex items-center justify-center shrink-0"
        >
          <Send size={16} />
        </button>
      </div>

      <PricingModal
        open={pricingOpen}
        onClose={() => !checkingOut && setPricingOpen(false)}
        onChoosePlan={handleChoosePlan}
      />
    </div>
  );
}
