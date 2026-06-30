"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Search, Star, Mail, Sparkles, Clock, Settings, DollarSign, Lock, Users } from "lucide-react";
import { cn } from "@/lib/utils";

const ICONS = { Home, Search, Star, Mail, Sparkles, Clock, Settings, DollarSign, Users };

interface NavItemProps {
  icon: keyof typeof ICONS;
  label: string;
  href?: string;
  locked?: boolean;
  collapsed?: boolean;
}

export function NavItem({ icon, label, href, locked, collapsed }: NavItemProps) {
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

  const content = (
    <>
      <Icon size={17} strokeWidth={2} className="shrink-0" />
      {!collapsed && (
        <>
          <span className="flex-1">{label}</span>
          {locked && <Lock size={12} className="opacity-70" />}
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

