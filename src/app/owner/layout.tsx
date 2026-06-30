import Link from "next/link";
import { Bell } from "lucide-react";
import { OwnerSidebar } from "@/components/owner/owner-sidebar";
import { OwnerTopbar } from "@/components/owner/owner-topbar";
import { MobileNavItem } from "@/components/owner/mobile-nav-item";

export default function OwnerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen">
      <OwnerSidebar />

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
          <Link
            href="/owner/profile"
            className="w-9 h-9 rounded-full bg-teal flex items-center justify-center text-white text-[13px] font-semibold"
          >
            <span className="sr-only">Your profile</span>
          </Link>
        </div>
      </header>

      <div className="flex-1 min-w-0 flex flex-col">
        <OwnerTopbar />

        {/* MAIN -- top padding on mobile clears the fixed topbar, bottom
            padding clears the fixed bottom nav. */}
        <main className="flex-1 min-w-0 pt-[60px] pb-24 md:pt-0 md:pb-0">
          {children}
        </main>
      </div>

      {/* MOBILE BOTTOM NAV */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-30 bg-bg-raised border-t border-line px-2 pt-2 pb-[max(10px,env(safe-area-inset-bottom))] flex justify-around">
        <MobileNavItem icon="Home" label="Home" href="/owner/dashboard" />
        <MobileNavItem icon="Search" label="Browse" href="/owner/browse" />
        <MobileNavItem icon="Mail" label="Messages" href="/owner/messages" />
        <MobileNavItem icon="Sparkles" label="AI" href="/owner/ai-tools" />
        <MobileNavItem icon="Settings" label="More" href="/owner/settings" />
      </nav>
    </div>
  );
}
