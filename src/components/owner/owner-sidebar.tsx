"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { NavItem } from "@/components/owner/nav-item";
import { LogoutButton } from "@/components/shared/logout-button";

export function OwnerSidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const [tier, setTier] = useState<string | null>(null);
  const [unreadMessageCount, setUnreadMessageCount] = useState(0);
  const [unreadAlertCount, setUnreadAlertCount] = useState(0);
  const [pendingApplicantCount, setPendingApplicantCount] = useState(0);
  const pathname = usePathname();

  useEffect(() => {
    fetch("/api/owner/profile/me")
      .then((res) => res.json())
      .then((data) => setTier(data.profile?.subscription_tier ?? "free"))
      .catch(() => setTier("free"));
  }, []);

  useEffect(() => {
    function refetchCounts() {
      // Messages unread count
      fetch("/api/messages")
        .then((res) => res.json())
        .then((data) => {
          const threads: { is_unread: boolean }[] = data.threads ?? [];
          setUnreadMessageCount(threads.filter((t) => t.is_unread).length);
        })
        .catch(() => {});

      // Match-alert unread count
      fetch("/api/notifications")
        .then((res) => res.json())
        .then((data) => setUnreadAlertCount(data.unreadByType?.match_alert ?? 0))
        .catch(() => {});

      // Pending applicants count — total across all active job postings.
      // Only fetches if the practice has the subscription (the endpoint
      // returns [] without it, so no wasted work in the free case).
      fetch("/api/owner/job-postings")
        .then((res) => res.json())
        .then((data) => {
          const postings: { pending_count: number }[] = data.postings ?? [];
          setPendingApplicantCount(
            postings.reduce((sum, p) => sum + (p.pending_count ?? 0), 0)
          );
        })
        .catch(() => {});
    }

    refetchCounts();
    const interval = setInterval(refetchCounts, 30000);
    return () => clearInterval(interval);
  }, [pathname]);

  // PAUSED (AI Pro tier): kept alongside tier fetch so re-enabling Pro
  // is just uncommenting the blocks below, not rebuilding from scratch.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const isPro = tier === "pro";

  return (
    <aside
      className={`hidden md:flex md:flex-col md:shrink-0 bg-ink px-4 py-7 sticky top-0 h-screen overflow-y-auto transition-[width] duration-200 ${
        collapsed ? "md:w-[76px]" : "md:w-[230px]"
      }`}
    >
      <div className={`flex items-center mb-9 ${collapsed ? "justify-center" : "justify-between px-2"}`}>
        <Link href="/" className="flex items-center gap-2">
          <span className="w-[7px] h-[7px] rounded-full bg-coral shrink-0" />
          {!collapsed && (
            <span className="font-serif text-lg font-semibold text-white whitespace-nowrap">
              Hdenta
            </span>
          )}
        </Link>
      </div>

      <button
        onClick={() => setCollapsed((c) => !c)}
        className="flex items-center justify-center gap-2 mb-5 mx-auto w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 text-[#B9C6C2] transition-colors"
        title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
      >
        {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
      </button>

      <nav className="flex-1">
        <NavItem icon="Home"      label="Dashboard"      href="/owner/dashboard"        collapsed={collapsed} />
        <NavItem icon="Search"    label="Browse"         href="/owner/browse"           collapsed={collapsed} />
        <NavItem icon="Star"      label="Match Alerts"   href="/owner/saved-searches"   collapsed={collapsed} badgeCount={unreadAlertCount} />
        <NavItem icon="Briefcase" label="Job Postings"   href="/owner/jobs"             collapsed={collapsed} badgeCount={pendingApplicantCount} />
        <NavItem icon="Users"     label="Team Roster"    href="/owner/roster"           collapsed={collapsed} />
        <NavItem icon="Mail"      label="Messages"       href="/owner/messages"         collapsed={collapsed} badgeCount={unreadMessageCount} />
        {/* PAUSED (AI Pro tier): AI Search/Advisor/Screening are on hold
            pending real demand. Remove locked/tag props and restore
            href + isPro guard when Pro ships for real. */}
        <NavItem
          icon="Sparkles"
          label="AI Tools"
          locked
          tag="Soon"
          collapsed={collapsed}
        />
        <NavItem icon="Clock"     label="Hiring Activity" href="/owner/hiring-activity" collapsed={collapsed} />
        <NavItem icon="LifeBuoy"  label="Support"         href="/owner/support"         collapsed={collapsed} />

        {!collapsed && (
          <div className="text-[10.5px] font-semibold uppercase tracking-wider text-[#6F837E] mt-6 mb-2 px-3.5">
            Practice
          </div>
        )}
        <NavItem icon="Settings"    label="Practice Profile" href="/owner/settings"          collapsed={collapsed} />
        <NavItem icon="DollarSign"  label="Billing"          href="/owner/settings/billing"  collapsed={collapsed} />
      </nav>

      {/* PAUSED (AI Pro tier): restore upgrade card when Pro re-enabled.
      {!collapsed && !isPro && (
        <div className="rounded-[14px] bg-white/5 border border-white/10 p-4 mt-6">
          <p className="text-xs leading-relaxed text-[#A9BAB6] mb-3">
            Pro unlocks AI search, AI outreach, and screening credits.
          </p>
          <Link
            href="/owner/settings/billing"
            className="block text-center w-full rounded-[9px] bg-coral hover:bg-coral-deep transition-colors text-white text-[12.5px] font-semibold py-2.5"
          >
            Upgrade to Pro — $250/yr
          </Link>
        </div>
      )}
      */}

      <div className="mt-3 pt-3 border-t border-white/10">
        <LogoutButton />
      </div>
    </aside>
  );
}
