"use client";

import { useEffect, useState } from "react";
import { MessageSquareText, Ticket, Clock, CheckCircle2, Loader2, FilePlus2 } from "lucide-react";
import { FileTicketModal } from "@/components/shared/file-ticket-modal";

interface SupportTicket {
  id: string;
  subject: string;
  priority: "normal" | "human_requested";
  status: "open" | "in_progress" | "resolved";
  created_at: string;
}

const STATUS_STYLES: Record<SupportTicket["status"], { label: string; className: string; icon: typeof Clock }> = {
  open: { label: "Open", className: "text-amber-700 bg-amber-100", icon: Clock },
  in_progress: { label: "In progress", className: "text-teal-deep bg-teal-tint", icon: Loader2 },
  resolved: { label: "Resolved", className: "text-ink-faint bg-line-soft", icon: CheckCircle2 },
};

// PAUSED (AI Pro tier): accountType is kept in the props even though
// it's currently unused -- it drove Pro-specific copy that's commented
// out above, and both call sites (owner/candidate support pages)
// already pass it, so keeping the prop means restoring that copy is a
// one-line change, not a signature change across multiple files.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function SupportPageContent({ accountType }: { accountType: "owner" | "candidate" }) {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [fileModalOpen, setFileModalOpen] = useState(false);

  function refetchTickets() {
    return fetch("/api/support-tickets")
      .then((res) => res.json())
      .then((data) => setTickets(data.tickets ?? []));
  }

  useEffect(() => {
    refetchTickets().finally(() => setLoading(false));
  }, []);

  function openChat() {
    window.dispatchEvent(new CustomEvent("Hdenta:open-help-chat"));
  }

  return (
    <div className="max-w-2xl mx-auto px-5 md:px-10 py-7 md:py-12">
      <h1 className="font-serif text-2xl md:text-3xl font-semibold mb-2">Support</h1>
      <p className="text-[14px] text-ink-faint mb-7">
        Chat with our AI for instant answers on anything -- setup, billing, troubleshooting.
        If it can&apos;t fully resolve something, it&apos;ll file a ticket for you.
      </p>

      <div className="flex flex-col sm:flex-row gap-2.5 mb-8">
        <button
          onClick={openChat}
          className="flex-1 flex items-center justify-center gap-2 bg-teal text-white font-semibold text-[14.5px] py-3.5 rounded-control hover:bg-teal-deep transition-colors"
        >
          <MessageSquareText size={16} /> Chat with AI support
        </button>
        <button
          onClick={() => setFileModalOpen(true)}
          className="flex-1 flex items-center justify-center gap-2 border border-line font-semibold text-[14.5px] py-3.5 rounded-control hover:border-teal hover:text-teal-deep transition-colors"
        >
          <FilePlus2 size={16} /> File a ticket directly
        </button>
      </div>

      <h2 className="text-[14px] font-semibold text-ink-soft mb-3 flex items-center gap-1.5">
        <Ticket size={14} /> Your tickets
      </h2>

      {loading && <p className="text-ink-faint text-[13.5px]">Loading…</p>}

      {!loading && tickets.length === 0 && (
        <div className="rounded-xl border border-dashed border-line p-8 text-center text-[13.5px] text-ink-faint">
          No tickets yet. Anything you escalate from the AI chat will show up here.
        </div>
      )}

      {tickets.length > 0 && (
        <div className="space-y-2">
          {tickets.map((t) => {
            const style = STATUS_STYLES[t.status];
            const StatusIcon = style.icon;
            return (
              <div key={t.id} className="flex items-center gap-3 p-4 rounded-xl border border-line bg-bg-raised">
                <div className="flex-1 min-w-0">
                  <p className="text-[14px] font-medium truncate">{t.subject}</p>
                  <p className="text-[12px] text-ink-faint">
                    {new Date(t.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
                    {t.priority === "human_requested" && " · Human requested"}
                  </p>
                </div>
                <span className={`flex items-center gap-1 text-[11.5px] font-semibold px-2.5 py-1 rounded-full shrink-0 ${style.className}`}>
                  <StatusIcon size={11} /> {style.label}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {fileModalOpen && (
        <FileTicketModal
          onClose={() => setFileModalOpen(false)}
          onFiled={() => {
            setFileModalOpen(false);
            refetchTickets();
          }}
        />
      )}
    </div>
  );
}
