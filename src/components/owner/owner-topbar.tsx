"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Bell, MessageSquare, User } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export function OwnerTopbar() {
  const [practiceName, setPracticeName] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) return;
      const { data: practice } = await supabase
        .from("practice_profiles")
        .select("practice_name")
        .eq("id", data.user.id)
        .maybeSingle();
      setPracticeName(practice?.practice_name ?? null);
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
      <button
        className="relative w-9 h-9 rounded-full bg-bg-raised border border-line flex items-center justify-center text-ink-soft hover:border-teal transition-colors"
        title="Notifications"
      >
        <Bell size={15} />
      </button>
      <Link
        href="/owner/profile"
        className="flex items-center gap-2 pl-1 pr-3 h-9 rounded-full bg-bg-raised border border-line hover:border-teal transition-colors"
        title="Your profile"
      >
        <div className="w-7 h-7 rounded-full bg-teal flex items-center justify-center text-white text-[11px] font-semibold shrink-0">
          <User size={13} />
        </div>
        {practiceName && (
          <span className="text-[13px] font-semibold max-w-[140px] truncate">{practiceName}</span>
        )}
      </Link>
    </div>
  );
}
