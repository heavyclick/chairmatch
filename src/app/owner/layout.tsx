import Link from "next/link";
import {
  Home,
  Star,
  Mail,
  Sparkles,
  Clock,
  Settings,
  DollarSign,
  Bell,
} from "lucide-react";
import { NavItem } from "@/components/owner/nav-item";

export default function OwnerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen">
      {/* DESKTOP SIDEBAR -- fixed width, content pinned top, upgrade card
          pinned bottom via mt-auto so there's no dead middle space
          regardless of nav item count. */}
      <aside className="hidden md:flex md:w-[230px] md:flex-col md:shrink-0 bg-ink px-4 py-7">
        <Link href="/" className="flex items-center gap-2 px-2 mb-9">
          <span className="w-[7px] h-[7px] rounded-full bg-coral" />
          <span className="font-serif text-lg font-semibold text-white">
            ChairMatch
          </span>
        </Link>

        <nav className="flex-1">
          <NavItem icon={Home} label="Browse" active />
          <NavItem icon={Star} label="Saved Searches" />
          <NavItem icon={Mail} label="Messages" />
          <NavItem icon={Sparkles} label="AI Tools" locked />
          <NavItem icon={Clock} label="Hiring Activity" />

          <div className="text-[10.5px] font-semibold uppercase tracking-wider text-[#6F837E] mt-6 mb-2 px-3.5">
            Practice
          </div>
          <NavItem icon={Settings} label="Practice Profile" />
          <NavItem icon={DollarSign} label="Billing" />
        </nav>

        {/* Pinned to bottom -- this is the fix for the dead vertical
            space: the upgrade card now anchors to the bottom of a flex
            column instead of floating in a too-tall fixed-height sidebar. */}
        <div className="rounded-[14px] bg-white/5 border border-white/10 p-4 mt-6">
          <p className="text-xs leading-relaxed text-[#A9BAB6] mb-3">
            Pro unlocks AI search, AI outreach, and screening credits — plus
            risk flags Standard can&apos;t see.
          </p>
          <button className="w-full rounded-[9px] bg-coral hover:bg-coral-deep transition-colors text-white text-[12.5px] font-semibold py-2.5">
            Upgrade to Pro — $250/yr
          </button>
        </div>
      </aside>

      {/* MOBILE TOPBAR */}
      <header className="md:hidden fixed top-0 inset-x-0 z-30 flex items-center justify-between bg-ink px-5 py-3.5">
        <Link href="/" className="flex items-center gap-2">
          <span className="w-[7px] h-[7px] rounded-full bg-coral" />
          <span className="font-serif text-base font-semibold text-white">
            ChairMatch
          </span>
        </Link>
        <div className="flex items-center gap-2.5">
          <button className="relative w-9 h-9 rounded-full bg-white/10 flex items-center justify-center text-white">
            <Bell size={15} />
            <span className="absolute top-1.5 right-1.5 w-[7px] h-[7px] rounded-full bg-coral ring-2 ring-ink" />
          </button>
          <div className="w-9 h-9 rounded-full bg-teal flex items-center justify-center text-white text-[13px] font-semibold">
            BS
          </div>
        </div>
      </header>

      {/* MAIN -- top padding on mobile clears the fixed topbar, bottom
          padding clears the fixed bottom nav. */}
      <main className="flex-1 min-w-0 pt-[60px] pb-24 md:pt-0 md:pb-0">
        {children}
      </main>

      {/* MOBILE BOTTOM NAV */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-30 bg-bg-raised border-t border-line px-2 pt-2 pb-[max(10px,env(safe-area-inset-bottom))] flex justify-around">
        <MobileNavItem icon={Home} label="Browse" active />
        <MobileNavItem icon={Star} label="Saved" />
        <MobileNavItem icon={Mail} label="Messages" />
        <MobileNavItem icon={Sparkles} label="AI" />
        <MobileNavItem icon={Settings} label="More" />
      </nav>
    </div>
  );
}

function MobileNavItem({
  icon: Icon,
  label,
  active,
}: {
  icon: typeof Home;
  label: string;
  active?: boolean;
}) {
  return (
    <div
      className={`flex flex-col items-center gap-1 text-[10.5px] ${
        active ? "text-teal-deep font-semibold" : "text-ink-faint"
      }`}
    >
      <Icon size={19} strokeWidth={active ? 2.3 : 2} />
      {label}
    </div>
  );
}
