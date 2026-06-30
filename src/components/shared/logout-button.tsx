"use client";

import { LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export function LogoutButton({ variant = "sidebar" }: { variant?: "sidebar" | "icon" }) {
  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.href = "/";
  }

  if (variant === "icon") {
    return (
      <button
        onClick={handleLogout}
        title="Log out"
        className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
      >
        <LogOut size={15} />
      </button>
    );
  }

  return (
    <button
      onClick={handleLogout}
      className="flex items-center gap-3 px-3.5 py-2.5 rounded-[10px] text-sm font-medium text-[#B9C6C2] hover:bg-white/5 hover:text-white transition-colors w-full"
    >
      <LogOut size={17} strokeWidth={2} className="shrink-0" />
      Log out
    </button>
  );
}
