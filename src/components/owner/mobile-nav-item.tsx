"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Search, Star, Mail, Sparkles, Settings, MessageSquare } from "lucide-react";

const ICONS = { Home, Search, Star, Mail, Sparkles, Settings, MessageSquare };

export function MobileNavItem({
  icon,
  label,
  href,
}: {
  icon: keyof typeof ICONS;
  label: string;
  href: string;
}) {
  const pathname = usePathname();
  const active = pathname === href || pathname.startsWith(href + "/");
  const Icon = ICONS[icon];
  return (
    <Link
      href={href}
      className={`flex flex-col items-center gap-1 text-[10.5px] ${
        active ? "text-teal-deep font-semibold" : "text-ink-faint"
      }`}
    >
      <Icon size={19} strokeWidth={active ? 2.3 : 2} />
      {label}
    </Link>
  );
}
