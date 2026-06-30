import Link from "next/link";
import { Home, MessageSquare, Settings, Bell, User, Eye, Building2 } from "lucide-react";
import { MobileNavItem } from "@/components/owner/mobile-nav-item";
import { LogoutButton } from "@/components/shared/logout-button";

export default function CandidateLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <aside className="hidden md:flex md:w-[210px] md:flex-col md:shrink-0 bg-ink px-4 py-7 sticky top-0 h-screen overflow-y-auto">
        <Link href="/" className="flex items-center gap-2 px-2 mb-9">
          <span className="w-[7px] h-[7px] rounded-full bg-coral" />
          <span className="font-serif text-lg font-semibold text-white">ChairMatch</span>
        </Link>
        <nav className="flex-1">
          <SidebarLink icon={Home} label="Dashboard" href="/candidate/dashboard" />
          <SidebarLink icon={User} label="My Profile" href="/candidate/profile" />
          <SidebarLink icon={Building2} label="Browse Practices" href="/candidate/practices" />
          <SidebarLink icon={Eye} label="See it from their side" href="/candidate/browse-preview" />
          <SidebarLink icon={MessageSquare} label="Messages" href="/candidate/messages" />
          <SidebarLink icon={Settings} label="Settings" href="/candidate/settings" />
        </nav>
        <div className="mt-3 pt-3 border-t border-white/10">
          <LogoutButton />
        </div>
      </aside>

      <header className="md:hidden fixed top-0 inset-x-0 z-30 flex items-center justify-between bg-ink px-5 py-3.5">
        <Link href="/" className="flex items-center gap-2">
          <span className="w-[7px] h-[7px] rounded-full bg-coral" />
          <span className="font-serif text-base font-semibold text-white">ChairMatch</span>
        </Link>
        <div className="flex items-center gap-2.5">
          <button className="relative w-9 h-9 rounded-full bg-white/10 flex items-center justify-center text-white">
            <Bell size={15} />
          </button>
          <Link
            href="/candidate/profile"
            className="w-9 h-9 rounded-full bg-teal flex items-center justify-center text-white"
          >
            <User size={15} />
          </Link>
        </div>
      </header>

      {/* DESKTOP TOPBAR -- mirrors the owner shell's icon row, fixing the
          audit finding that only owners had notification/message icons
          and candidates had none at all on desktop. */}
      <div className="flex-1 min-w-0 flex flex-col">
        <div className="hidden md:flex items-center justify-end gap-2.5 px-8 py-4 sticky top-0 z-20 bg-bg/80 backdrop-blur-sm">
          <Link
            href="/candidate/messages"
            className="w-9 h-9 rounded-full bg-bg-raised border border-line flex items-center justify-center text-ink-soft hover:border-teal transition-colors"
            title="Messages"
          >
            <MessageSquare size={15} />
          </Link>
          <button
            className="w-9 h-9 rounded-full bg-bg-raised border border-line flex items-center justify-center text-ink-soft hover:border-teal transition-colors"
            title="Notifications"
          >
            <Bell size={15} />
          </button>
          <Link
            href="/candidate/profile"
            className="w-9 h-9 rounded-full bg-teal flex items-center justify-center text-white hover:bg-teal-deep transition-colors"
            title="Your profile"
          >
            <User size={14} />
          </Link>
        </div>

        <main className="flex-1 min-w-0 pt-[60px] pb-24 md:pt-0 md:pb-0">{children}</main>
      </div>

      <nav className="md:hidden fixed bottom-0 inset-x-0 z-30 bg-bg-raised border-t border-line px-2 pt-2 pb-[max(10px,env(safe-area-inset-bottom))] flex justify-around">
        <MobileNavItem icon="Home" label="Home" href="/candidate/dashboard" />
        <MobileNavItem icon="MessageSquare" label="Messages" href="/candidate/messages" />
        <MobileNavItem icon="Settings" label="Settings" href="/candidate/settings" />
      </nav>
    </div>
  );
}

function SidebarLink({ icon: Icon, label, href }: { icon: typeof Home; label: string; href: string }) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 px-3.5 py-2.5 rounded-[10px] text-sm font-medium text-[#B9C6C2] hover:bg-white/5 hover:text-white transition-colors mb-0.5"
    >
      <Icon size={17} strokeWidth={2} className="shrink-0" />
      {label}
    </Link>
  );
}
