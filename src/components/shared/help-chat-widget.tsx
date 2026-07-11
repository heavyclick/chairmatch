"use client";

import { useState, useRef, useEffect } from "react";
import { MessageCircle, X, Send, Loader2, LifeBuoy, Phone } from "lucide-react";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

/**
 * Floating help-chat widget -- available on both owner and candidate
 * layouts. Collapsed to a bubble by default so it doesn't compete with
 * the actual product UI; expands to a full chat panel on click.
 */
export function HelpChatWidget({ accountType }: { accountType: "owner" | "candidate" }) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [escalated, setEscalated] = useState<"ticket" | "human" | null>(null);
  const [isPro, setIsPro] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  // Lets other pages (e.g. the Support sidebar page) open this
  // floating widget programmatically, since it's mounted once at the
  // layout level and has no other way to be triggered externally.
  useEffect(() => {
    function handleOpenRequest() {
      setOpen(true);
    }
    window.addEventListener("Hdenta:open-help-chat", handleOpenRequest);
    return () => window.removeEventListener("Hdenta:open-help-chat", handleOpenRequest);
  }, []);

  // PAUSED (AI Pro tier): "Talk to a human" is gated on subscription_tier
  // === "pro", which is currently unreachable through any live purchase
  // path (see src/app/api/checkout/route.ts) -- so this correctly never
  // renders right now without needing its own separate flag. Left as
  // real tier-driven logic (not hardcoded off) so it comes back to life
  // automatically the moment Pro is re-enabled, no changes needed here.
  //
  // Only Pro-tier owners get the "talk to a human" fast-path -- checked
  // here so the button isn't shown to accounts it wouldn't actually
  // work for (the escalate route re-verifies this server-side
  // regardless; this is purely so the UI doesn't offer something that
  // silently degrades to a normal ticket for most owners).
  useEffect(() => {
    if (accountType !== "owner") return;
    fetch("/api/owner/profile/me")
      .then((res) => res.json())
      .then((data) => setIsPro(data.profile?.subscription_tier === "pro"))
      .catch(() => {});
  }, [accountType]);

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text || sending) return;

    const nextMessages: ChatMessage[] = [...messages, { role: "user", content: text }];
    setMessages(nextMessages);
    setInput("");
    setSending(true);
    try {
      const res = await fetch("/api/help-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: nextMessages }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setMessages((prev) => [...prev, { role: "assistant", content: data.reply }]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Sorry, I couldn't get a response. You can file a support ticket below instead." },
      ]);
    } finally {
      setSending(false);
    }
  }

  async function escalate(requestHuman: boolean) {
    setSending(true);
    try {
      const res = await fetch("/api/help-chat/escalate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject: messages[0]?.content?.slice(0, 80) || "Support request from help chat",
          conversation: messages,
          requestHuman,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setEscalated(data.humanRequestHonored ? "human" : "ticket");
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Couldn't file that right now -- please try again in a moment." },
      ]);
    } finally {
      setSending(false);
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-5 right-5 z-40 w-12 h-12 rounded-full bg-teal text-white shadow-lg flex items-center justify-center hover:bg-teal-deep transition-colors"
        title="Get help"
      >
        <MessageCircle size={20} />
      </button>
    );
  }

  return (
    <div className="fixed bottom-5 right-5 z-40 w-[calc(100vw-2.5rem)] max-w-sm h-[70vh] max-h-[520px] bg-bg-raised border border-line rounded-2xl shadow-xl flex flex-col overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-line bg-ink text-white">
        <span className="text-[14px] font-semibold flex items-center gap-2">
          <LifeBuoy size={15} /> Hdenta Help
        </span>
        <button onClick={() => setOpen(false)} aria-label="Close">
          <X size={17} />
        </button>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {messages.length === 0 && (
          <p className="text-[13px] text-ink-faint">
            Ask me anything about how Hdenta works -- browsing, pricing, messaging, alerts, reviews,
            billing, whatever you&apos;re stuck on.
          </p>
        )}
        {messages.map((m, i) => (
          <div
            key={i}
            className={`text-[13.5px] leading-relaxed rounded-xl px-3 py-2 max-w-[85%] ${
              m.role === "user" ? "bg-teal text-white ml-auto" : "bg-bg border border-line"
            }`}
          >
            {m.content}
          </div>
        ))}
        {sending && <Loader2 size={15} className="animate-spin text-ink-faint" />}

        {escalated && (
          <div className="text-[13px] bg-teal-tint/40 border border-teal/30 rounded-xl px-3 py-2.5">
            {escalated === "human"
              ? "Got it -- flagged for a direct human reply. We'll be in touch soon."
              : "Support ticket filed -- you'll hear back by email."}
          </div>
        )}
      </div>

      {!escalated && messages.length > 0 && (
        <div className="px-4 py-2 border-t border-line flex gap-2">
          <button
            onClick={() => escalate(false)}
            disabled={sending}
            className="flex-1 text-[12px] font-medium text-teal-deep border border-line rounded-lg py-1.5 hover:border-teal transition-colors"
          >
            File a ticket
          </button>
          {accountType === "owner" && isPro && (
            <button
              onClick={() => escalate(true)}
              disabled={sending}
              className="flex-1 flex items-center justify-center gap-1 text-[12px] font-medium text-teal-deep border border-line rounded-lg py-1.5 hover:border-teal transition-colors"
            >
              <Phone size={12} /> Talk to a human
            </button>
          )}
        </div>
      )}

      <form onSubmit={sendMessage} className="flex items-center gap-2 px-3 py-2.5 border-t border-line">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type a question…"
          disabled={sending || !!escalated}
          className="flex-1 text-[13.5px] bg-bg border border-line rounded-full px-3.5 py-2 outline-none focus:border-teal disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={sending || !input.trim() || !!escalated}
          className="w-8 h-8 rounded-full bg-teal text-white flex items-center justify-center disabled:opacity-40 hover:bg-teal-deep transition-colors shrink-0"
        >
          <Send size={14} />
        </button>
      </form>
    </div>
  );
}
