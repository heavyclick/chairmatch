"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { User, ChevronDown } from "lucide-react";
import { LogoutButton } from "@/components/shared/logout-button";

/**
 * Previously the topbar/mobile-header profile icon was just a plain
 * Link straight to /owner/profile or /candidate/profile -- no way to
 * log out from there at all, and no photo support even though both
 * practice_profiles.photo_url and candidate_profiles.photo_url have
 * existed since early migrations. This replaces that with a real
 * dropdown: click the avatar, get "View profile" + "Log out".
 */
export function ProfileMenu({
  profileHref,
  photoUrl,
  label,
  dark = false,
}: {
  profileHref: string;
  photoUrl: string | null;
  label?: string | null;
  dark?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const avatar = photoUrl ? (
    <Image src={photoUrl} alt="" width={28} height={28} className="w-7 h-7 rounded-full object-cover shrink-0" />
  ) : (
    <div className="w-7 h-7 rounded-full bg-teal flex items-center justify-center text-white shrink-0">
      <User size={13} />
    </div>
  );

  return (
    <div ref={menuRef} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className={`flex items-center gap-2 pl-1 pr-2.5 h-9 rounded-full border transition-colors ${
          dark
            ? "bg-white/10 border-transparent hover:bg-white/20"
            : "bg-bg-raised border-line hover:border-teal"
        }`}
        title="Your account"
      >
        {avatar}
        {label && <span className="text-[13px] font-semibold max-w-[140px] truncate hidden md:inline">{label}</span>}
        <ChevronDown size={13} className={dark ? "text-white/70" : "text-ink-faint"} />
      </button>

      {open && (
        <div className="absolute right-0 top-11 z-50 w-44 bg-bg border border-line rounded-xl shadow-lg overflow-hidden py-1">
          <Link
            href={profileHref}
            onClick={() => setOpen(false)}
            className="block px-3.5 py-2.5 text-sm font-medium text-ink hover:bg-bg-raised transition-colors"
          >
            View profile
          </Link>
          <div className="border-t border-line my-1" />
          <div className="px-1">
            <LogoutButton variant="menu" />
          </div>
        </div>
      )}
    </div>
  );
}
