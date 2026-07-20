"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Home, MessageSquare, Settings, User, Building2, LifeBuoy } from "lucide-react";
import { usePathname } from "next/navigation";

function SidebarLink({
  icon: Icon,
  label,
  href,
  badgeCount,
}: {
  icon: typeof Home;
  label: string;
  href: string;
  badgeCount?: number;
}) {
  const pathname = usePathname();
  const active = pathname === href || pathname.startsWith(href + "/");
  return (
    <Link
      href={href}
      className={`flex items-center gap-3 px-3.5 py-2.5 rounded-[10px] text-sm font-medium transition-colors mb-0.5 ${
        active ? "bg-teal text-white" : "text-[#B9C6C2] hover:bg-white/5 hover:text-white"
      }`}
    >
      <Icon size={17} strokeWidth={2} className="shrink-0" />
      <span className="flex-1">{label}</span>
      {!!badgeCount && (
        <span className="min-w-[18px] h-[18px] px-1 rounded-full bg-coral text-white text-[10.5px] font-bold flex items-center justify-center shrink-0">
          {badgeCount > 9 ? "9+" : badgeCount}
        </span>
      )}
    </Link>
  );
}

export function CandidateSidebarNav() {
  const [unreadMessageCount, setUnreadMessageCount] = useState(0);
  const pathname = usePathname();

  useEffect(() => {
    function refetchUnread() {
      fetch("/api/messages")
        .then((res) => res.json())
        .then((data) => {
          const threads: { is_unread: boolean }[] = data.threads ?? [];
          setUnreadMessageCount(threads.filter((t) => t.is_unread).length);
        })
        .catch(() => {});
    }

    // Was firing once on mount only (`[]` deps), so the badge never
    // updated after that -- opening a thread marks it read server-side
    // (see /api/messages GET), but this component doesn't remount on
    // client-side nav since it lives in the persistent layout, so the
    // stale count just sat there even after reading every message.
    // Refetching on pathname change picks it up as soon as the user
    // navigates back out of a thread; the 30s poll (matching
    // notification-bell's pattern) covers messages arriving while
    // they're already sitting on a page.
    refetchUnread();
    const interval = setInterval(refetchUnread, 30000);
    return () => clearInterval(interval);
  }, [pathname]);

  return (
    <nav className="flex-1">
      <SidebarLink icon={Home} label="Dashboard" href="/candidate/dashboard" />
      <SidebarLink icon={User} label="My Profile" href="/candidate/profile" />
      <SidebarLink icon={Building2} label="Browse Jobs" href="/jobs" />
      <SidebarLink icon={MessageSquare} label="Messages" href="/candidate/messages" badgeCount={unreadMessageCount} />
      <SidebarLink icon={LifeBuoy} label="Support" href="/candidate/support" />
      <SidebarLink icon={Settings} label="Settings" href="/candidate/settings" />
    </nav>
  );
}
