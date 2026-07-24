"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Search, Star, Mail, Sparkles, Clock, Settings, DollarSign, Lock, Users, LifeBuoy, Briefcase } from "lucide-react";
import { cn } from "@/lib/utils";

const ICONS = { Home, Search, Star, Mail, Sparkles, Clock, Settings, DollarSign, Users, LifeBuoy, Briefcase };

interface NavItemProps {
  icon: keyof typeof ICONS;
  label: string;
  href?: string;
  locked?: boolean;
  collapsed?: boolean;
  badgeCount?: number;
  /** Small text tag next to the label, e.g. "Soon" -- distinct from badgeCount (an unread-count bubble). Only rendered when expanded; collapsed mode has no room for it. */
  tag?: string;
}

export function NavItem({ icon, label, href, locked, collapsed, badgeCount, tag }: NavItemProps) {
  const pathname = usePathname();
  const active = href ? pathname === href || pathname.startsWith(href + "/") : false;
  const Icon = ICONS[icon];

  const classes = cn(
    "flex items-center gap-3 px-3.5 py-2.5 rounded-[10px] text-sm font-medium cursor-pointer transition-colors mb-0.5",
    collapsed && "justify-center px-0",
    active && "bg-teal text-white",
    !active && !locked && "text-[#B9C6C2] hover:bg-white/5 hover:text-white",
    locked && "text-[#B9C6C2]/45 cursor-default"
  );

  const badge =
    badgeCount && badgeCount > 0 ? (
      <span className="min-w-[18px] h-[18px] px-1 rounded-full bg-coral text-white text-[10.5px] font-bold flex items-center justify-center shrink-0">
        {badgeCount > 9 ? "9+" : badgeCount}
      </span>
    ) : null;

  const content = (
    <>
      <span className="relative shrink-0">
        <Icon size={17} strokeWidth={2} />
        {collapsed && badge && <span className="absolute -top-1.5 -right-1.5">{badge}</span>}
      </span>
      {!collapsed && (
        <>
          <span className="flex-1">{label}</span>
          {tag && (
            <span className="text-[9.5px] font-bold uppercase tracking-wide text-[#B9C6C2]/70 bg-white/5 px-1.5 py-0.5 rounded-full">
              {tag}
            </span>
          )}
          {locked && <Lock size={12} className="opacity-70" />}
          {!locked && badge}
        </>
      )}
    </>
  );

  if (locked || !href) {
    return <div className={classes} title={collapsed ? label : undefined}>{content}</div>;
  }

  return (
    <Link href={href} className={classes} title={collapsed ? label : undefined}>
      {content}
    </Link>
  );
}
