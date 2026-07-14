"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { OwnerSidebar } from "@/components/owner/owner-sidebar";
import { OwnerTopbar } from "@/components/owner/owner-topbar";
import { MobileNavItem } from "@/components/owner/mobile-nav-item";
import { SharePopupTracker } from "@/components/shared/share-popup";
import { HelpChatWidget } from "@/components/shared/help-chat-widget";
import { NotificationBell } from "@/components/shared/notification-bell";
import { ProfileMenu } from "@/components/shared/profile-menu";
import { createClient } from "@/lib/supabase/client";

export default function OwnerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) return;
      const { data: practice } = await supabase
        .from("practice_profiles")
        .select("photo_url")
        .eq("id", data.user.id)
        .maybeSingle();
      setPhotoUrl(practice?.photo_url ?? null);
    });
  }, []);

  return (
    <div className="flex min-h-screen">
      <SharePopupTracker accountType="owner" />
      <HelpChatWidget accountType="owner" />
      <OwnerSidebar />

      {/* MOBILE TOPBAR -- logo now points into the app (this layout only
          ever renders for an already-authenticated owner, so there's no
          reason it should ever send them back out to the marketing
          homepage), and the profile icon is a real ProfileMenu now
          (photo + logout) instead of a dead-end link with no way to
          log out from. The bell was previously a static, non-functional
          placeholder -- now the real NotificationBell. */}
      <header className="md:hidden fixed top-0 inset-x-0 z-30 flex items-center justify-between bg-ink px-5 py-3.5">
        <Link href="/owner/dashboard" className="flex items-center gap-2">
          <span className="w-[7px] h-[7px] rounded-full bg-coral" />
          <span className="font-serif text-base font-semibold text-white">
            Hdenta
          </span>
        </Link>
        <div className="flex items-center gap-2.5">
          <NotificationBell dark />
          <ProfileMenu profileHref="/owner/profile" photoUrl={photoUrl} dark />
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
