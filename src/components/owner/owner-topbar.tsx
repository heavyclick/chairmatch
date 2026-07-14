"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { MessageSquare } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { NotificationBell } from "@/components/shared/notification-bell";
import { ProfileMenu } from "@/components/shared/profile-menu";

export function OwnerTopbar() {
  const [practiceName, setPracticeName] = useState<string | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) return;
      const { data: practice } = await supabase
        .from("practice_profiles")
        .select("practice_name, photo_url")
        .eq("id", data.user.id)
        .maybeSingle();
      setPracticeName(practice?.practice_name ?? null);
      setPhotoUrl(practice?.photo_url ?? null);
    });
  }, []);

  return (
    <div className="hidden md:flex items-center justify-end gap-2.5 px-8 py-4 sticky top-0 z-20 bg-bg/80 backdrop-blur-sm">
      <Link
        href="/owner/messages"
        className="w-9 h-9 rounded-full bg-bg-raised border border-line flex items-center justify-center text-ink-soft hover:border-teal transition-colors"
        title="Messages"
      >
        <MessageSquare size={15} />
      </Link>
      <NotificationBell />
      <ProfileMenu profileHref="/owner/profile" photoUrl={photoUrl} label={practiceName} />
    </div>
  );
}
