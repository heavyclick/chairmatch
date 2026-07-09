"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Bell } from "lucide-react";

interface Notification {
  id: string;
  type: string;
  title: string;
  body: string | null;
  link: string | null;
  read_at: string | null;
  created_at: string;
}

/**
 * Real notification bell -- replaces the purely decorative <button>
 * that previously rendered in both the owner topbar and candidate
 * layout with no badge, no count, and no click handler at all.
 *
 * Polls every 30s rather than using a websocket/realtime subscription --
 * simplest thing that actually works for a bell icon; revisit only if
 * notification latency ever becomes a real complaint.
 */
export function NotificationBell({ dark = false }: { dark?: boolean }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  async function fetchNotifications() {
    try {
      const res = await fetch("/api/notifications");
      if (!res.ok) return;
      const data = await res.json();
      setNotifications(data.notifications ?? []);
      setUnreadCount(data.unreadCount ?? 0);
    } catch {
      // Non-fatal -- bell just stays at its last known state until the next poll succeeds.
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial sync from an external source (the notifications endpoint) on mount, then a real polling subscription; not a derived-state anti-pattern.
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30_000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  async function handleOpen() {
    const wasOpen = open;
    setOpen(!wasOpen);
    if (!wasOpen && unreadCount > 0) {
      await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      setUnreadCount(0);
      setNotifications((prev) => prev.map((n) => ({ ...n, read_at: n.read_at ?? new Date().toISOString() })));
    }
  }

  function handleNotificationClick(n: Notification) {
    setOpen(false);
    if (n.link) router.push(n.link);
  }

  return (
    <div className="relative" ref={containerRef}>
      <button
        onClick={handleOpen}
        title="Notifications"
        className={
          dark
            ? "relative w-9 h-9 rounded-full bg-white/10 flex items-center justify-center text-white"
            : "relative w-9 h-9 rounded-full bg-bg-raised border border-line flex items-center justify-center text-ink-soft hover:border-teal transition-colors"
        }
      >
        <Bell size={15} />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full bg-coral text-white text-[10px] font-bold flex items-center justify-center">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 max-h-96 overflow-y-auto rounded-xl border border-line bg-bg-raised shadow-lg z-50">
          <div className="px-4 py-3 border-b border-line">
            <p className="text-[13px] font-semibold text-ink">Notifications</p>
          </div>
          {notifications.length === 0 ? (
            <p className="px-4 py-8 text-center text-[12.5px] text-ink-faint">Nothing yet.</p>
          ) : (
            notifications.map((n) => (
              <button
                key={n.id}
                onClick={() => handleNotificationClick(n)}
                className="w-full text-left px-4 py-3 border-b border-line last:border-0 hover:bg-bg transition-colors"
              >
                <p className="text-[13px] font-medium text-ink">{n.title}</p>
                {n.body && <p className="text-[12px] text-ink-faint mt-0.5 line-clamp-2">{n.body}</p>}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
