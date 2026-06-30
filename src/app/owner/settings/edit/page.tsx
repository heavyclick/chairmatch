"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Building2, MapPin, Wrench, Heart, ChevronRight, Camera, Images,
} from "lucide-react";

interface EditSection {
  key: string;
  label: string;
  icon: typeof Building2;
  step: number;
  summary: (profile: Record<string, unknown> | null) => string;
}

const SECTIONS: EditSection[] = [
  { key: "photo_name", label: "Practice name & photo", icon: Camera, step: 1, summary: (p) => (p?.practice_name as string) || "Not set" },
  { key: "location", label: "Location & specialty", icon: MapPin, step: 1, summary: (p) => p?.specialty ? String(p.specialty) : "Not set" },
  { key: "software", label: "Software & operating hours", icon: Wrench, step: 2, summary: (p) => `${(p?.software as unknown[])?.length || 0} listed` },
  { key: "culture", label: "Culture, expectations, ideal staff", icon: Heart, step: 3, summary: () => "Edit your answers" },
  { key: "gallery", label: "Photos & Google reviews link", icon: Images, step: 4, summary: () => "Edit photos & link" },
];

export default function OwnerEditProfileHubPage() {
  const [profile, setProfile] = useState<Record<string, unknown> | null>(null);

  useEffect(() => {
    fetch("/api/owner/profile/me")
      .then((res) => res.json())
      .then((data) => setProfile(data.profile))
      .catch(() => {});
  }, []);

  return (
    <div className="max-w-xl mx-auto px-5 md:px-10 py-7 md:py-12">
      <h1 className="font-serif text-2xl md:text-3xl font-semibold mb-2">Edit practice profile</h1>
      <p className="text-[13.5px] text-ink-faint mb-7">
        Tap any section to edit just that part.
      </p>

      <div className="space-y-2">
        {SECTIONS.map((section) => {
          const Icon = section.icon;
          return (
            <Link
              key={section.key}
              href={`/onboarding/owner?step=${section.step}`}
              className="flex items-center gap-3.5 p-4 rounded-xl border border-line bg-bg-raised hover:border-teal transition-colors"
            >
              <div className="w-9 h-9 rounded-lg bg-teal-tint flex items-center justify-center text-teal-deep shrink-0">
                <Icon size={16} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[14px] font-semibold">{section.label}</div>
                <div className="text-[12.5px] text-ink-faint truncate">{section.summary(profile)}</div>
              </div>
              <ChevronRight size={16} className="text-ink-faint shrink-0" />
            </Link>
          );
        })}
      </div>

      <div className="mt-8 pt-6 border-t border-line">
        <Link
          href="/owner/settings/account"
          className="block text-center text-[13.5px] font-semibold text-coral-deep py-2"
        >
          Delete or deactivate account
        </Link>
      </div>
    </div>
  );
}
