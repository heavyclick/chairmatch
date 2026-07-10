"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { X, Share2, Copy, Check } from "lucide-react";

const COPY_BY_TYPE = {
  owner: {
    title: "Know another practice that's short-staffed?",
    body: "A lot of practices are quietly struggling to find good people right now. If you know another owner dealing with the same thing, passing this along could genuinely help them out -- and it grows the pool of candidates everyone here gets to see, including you.",
  },
  candidate: {
    title: "Know someone else job-hunting in dental?",
    body: "Job searching in this field can be rough, especially without the right connections. If you know someone else looking -- a classmate, a coworker between jobs -- sharing this could really help them, and it means more practices to choose from for everyone here.",
  },
};

/**
 * Renders the actual popup UI. Mounted by SharePopupTracker once the
 * cadence check (src/app/api/share-popup/track-nav) says it's time --
 * this component itself has no cadence logic, it just presents the ask
 * and records the response.
 */
export function SharePopup({
  accountType,
  onClose,
}: {
  accountType: "owner" | "candidate";
  onClose: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const [canNativeShare, setCanNativeShare] = useState(false);
  const copy = COPY_BY_TYPE[accountType];
  const shareUrl = typeof window !== "undefined" ? window.location.origin : "https://Hdenta.com";

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time client-only capability detection (navigator.share doesn't exist during SSR), not derived state from props/other state.
    setCanNativeShare(typeof navigator !== "undefined" && !!navigator.share);
  }, []);

  async function respond(action: "shared" | "dismissed" | "dont_show_again") {
    await fetch("/api/share-popup/respond", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    onClose();
  }

  async function handleShare() {
    if (canNativeShare) {
      try {
        await navigator.share({ title: "Hdenta", text: copy.body, url: shareUrl });
        await respond("shared");
        return;
      } catch {
        // User cancelled the native share sheet -- not an error, just
        // don't mark it as shared.
        return;
      }
    }
    // No Web Share API (most desktop browsers) -- copy to clipboard instead.
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => respond("shared"), 900);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-ink/40 px-4 pb-4 md:pb-0">
      <div className="w-full md:max-w-sm bg-bg-raised rounded-2xl p-5 relative">
        <button
          onClick={() => respond("dismissed")}
          className="absolute top-3.5 right-3.5 text-ink-faint hover:text-ink"
          aria-label="Close"
        >
          <X size={17} />
        </button>
        <h3 className="text-[16px] font-semibold pr-6 mb-1.5">{copy.title}</h3>
        <p className="text-[13.5px] text-ink-soft leading-relaxed mb-4">{copy.body}</p>
        <button
          onClick={handleShare}
          className="w-full flex items-center justify-center gap-2 bg-teal text-white font-semibold text-[14px] py-2.5 rounded-control hover:bg-teal-deep transition-colors mb-2"
        >
          {copied ? <Check size={15} /> : canNativeShare ? <Share2 size={15} /> : <Copy size={15} />}
          {copied ? "Link copied" : canNativeShare ? "Share Hdenta" : "Copy link"}
        </button>
        <button
          onClick={() => respond("dont_show_again")}
          className="w-full text-center text-[12.5px] text-ink-faint py-1.5"
        >
          Don&apos;t show this again
        </button>
      </div>
    </div>
  );
}

/**
 * Drop this into both owner and candidate layouts (mounted once, near
 * the root). Fires the nav-tracking check on every route change and
 * shows SharePopup when the server says it's time -- keeps ALL cadence
 * logic server-side (see the API route), this component just reacts to
 * the answer.
 */
export function SharePopupTracker({ accountType }: { accountType: "owner" | "candidate" }) {
  const pathname = usePathname();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    fetch("/api/share-popup/track-nav", { method: "POST" })
      .then((res) => res.json())
      .then((data) => {
        if (data.shouldShow) setVisible(true);
      })
      .catch(() => {});
  }, [pathname]);

  if (!visible) return null;
  return <SharePopup accountType={accountType} onClose={() => setVisible(false)} />;
}
