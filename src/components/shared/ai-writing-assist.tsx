"use client";

import { useState, useRef, useEffect } from "react";
import { Sparkles, Send, Loader2 } from "lucide-react";

interface AiWritingAssistProps {
  field: "value_add" | "future_goals" | "recovery_scenario" | "culture" | "thrive" | "honest_challenges";
  currentValue: string;
  onSuggestion?: (text: string) => void;
}

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export function AiWritingAssist({ field, currentValue }: AiWritingAssistProps) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  async function askForHelp(userText: string) {
    setError(null);
    setLoading(true);
    const nextHistory: ChatMessage[] = [...messages, { role: "user", content: userText }];
    setMessages(nextHistory);
    setInput("");

    try {
      const res = await fetch("/api/ai/onboarding-assist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          field,
          draftText: userText,
          conversationHistory: messages,
        }),
      });
      if (!res.ok) throw new Error("AI assist request failed");
      const data = await res.json();
      setMessages([...nextHistory, { role: "assistant", content: data.reply }]);
    } catch {
      setError(
        "Couldn't reach the writing assistant right now — no problem, just write it in your own words below."
      );
    } finally {
      setLoading(false);
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => {
          setOpen(true);
          if (messages.length === 0) {
            askForHelp(currentValue || "I'm not sure how to start.");
          }
        }}
        className="flex items-center gap-1.5 text-[12.5px] font-semibold text-teal-deep hover:text-teal transition-colors"
      >
        <Sparkles size={13} />
        Stuck? Get help writing this
      </button>
    );
  }

  return (
    <div className="rounded-xl border border-teal-tint bg-teal-tint/40 overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-teal-tint bg-teal-tint/60">
        <Sparkles size={13} className="text-teal-deep" />
        <span className="text-[12.5px] font-semibold text-teal-deep">
          Writing helper
        </span>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="ml-auto text-[12px] text-ink-faint hover:text-ink"
        >
          Close
        </button>
      </div>

      <div ref={scrollRef} className="max-h-52 overflow-y-auto px-4 py-3 space-y-2.5">
        {messages.map((m, i) => (
          <div
            key={i}
            className={
              m.role === "assistant"
                ? "text-[13.5px] text-ink leading-relaxed"
                : "text-[13.5px] text-ink-soft italic leading-relaxed"
            }
          >
            {m.role === "assistant" ? m.content : `"${m.content}"`}
          </div>
        ))}
        {loading && (
          <div className="flex items-center gap-1.5 text-ink-faint text-[12.5px]">
            <Loader2 size={12} className="animate-spin" /> thinking…
          </div>
        )}
        {error && <div className="text-[12.5px] text-coral-deep">{error}</div>}
      </div>

      <div className="flex items-center gap-2 px-3 py-2.5 border-t border-teal-tint bg-bg-raised">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && input.trim()) askForHelp(input.trim());
          }}
          placeholder="Reply, or paste what you've got so far…"
          className="flex-1 text-[13.5px] outline-none bg-transparent"
        />
        <button
          type="button"
          disabled={!input.trim() || loading}
          onClick={() => input.trim() && askForHelp(input.trim())}
          className="text-teal-deep disabled:text-ink-faint"
        >
          <Send size={15} />
        </button>
      </div>
    </div>
  );
}
