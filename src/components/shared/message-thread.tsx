"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Send, Sparkles } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface Message {
  id: string;
  sender_id: string;
  body: string;
  ai_drafted: boolean;
  sent_at: string;
}

export function MessageThread({ threadId, backHref }: { threadId: string; backHref: string }) {
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      setCurrentUserId(data.user?.id ?? null);
    });
  }, []);

  useEffect(() => {
    fetch(`/api/messages?thread_id=${threadId}`)
      .then((res) => res.json())
      .then((data) => setMessages(data.messages ?? []))
      .finally(() => setLoading(false));
  }, [threadId]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  async function send() {
    if (!input.trim()) return;
    setSending(true);
    try {
      const res = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ threadId, body: input.trim() }),
      });
      if (res.ok) {
        const data = await res.json();
        setMessages((m) => [...m, data.message]);
        setInput("");
      }
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto px-5 md:px-0 py-7 md:py-12 flex flex-col h-[calc(100vh-100px)] md:h-[calc(100vh-60px)]">
      <button
        onClick={() => router.push(backHref)}
        className="flex items-center gap-1.5 text-[13px] text-ink-faint hover:text-ink mb-5 shrink-0"
      >
        <ArrowLeft size={14} /> Back to messages
      </button>

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
    </div>
  );
}

