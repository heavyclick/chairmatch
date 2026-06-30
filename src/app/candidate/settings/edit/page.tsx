"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  User, MapPin, Calendar, DollarSign, Briefcase, GraduationCap,
  Wrench, Heart, ShieldAlert, ChevronRight, Camera,
} from "lucide-react";

interface EditSection {
  key: string;
  label: string;
  icon: typeof User;
  step: number; // which onboarding step this field lives on, for direct-jump editing
  summary: (profile: Record<string, unknown> | null) => string;
}

const SECTIONS: EditSection[] = [
  { key: "photo_name", label: "Name & photo", icon: Camera, step: 1, summary: (p) => (p?.full_name as string) || "Not set" },
  { key: "role", label: "Role", icon: Briefcase, step: 1, summary: (p) => (p?.role as { label?: string })?.label || "Not set" },
  { key: "location", label: "Location", icon: MapPin, step: 2, summary: (p) => p?.city ? `${p.city}, ${p.state}` : "Not set" },
  { key: "employment", label: "Employment type & remote/relocation", icon: Briefcase, step: 3, summary: (p) => (p?.employment_types as string[])?.join(", ") || "Not set" },
  { key: "availability", label: "Availability (days & hours)", icon: Calendar, step: 4, summary: (p) => `${(p?.availability as unknown[])?.length || 0} days set` },
  { key: "pay", label: "Pay range", icon: DollarSign, step: 5, summary: (p) => p?.pay_range_min ? `$${p.pay_range_min}-${p.pay_range_max}` : "Not set" },
  { key: "software", label: "Software experience", icon: Wrench, step: 5, summary: (p) => `${(p?.software as unknown[])?.length || 0} listed` },
  { key: "background", label: "Work history, education, skills, hobbies", icon: GraduationCap, step: 6, summary: () => "Edit details" },
  { key: "qualitative", label: "What you bring, goals, ideal practice", icon: Heart, step: 7, summary: () => "Edit your answers" },
  { key: "dealbreakers", label: "Dealbreakers", icon: ShieldAlert, step: 8, summary: (p) => `${(p?.dealbreakers as unknown[])?.length || 0} set` },
];

export default function EditProfileHubPage() {
  const [profile, setProfile] = useState<Record<string, unknown> | null>(null);

  useEffect(() => {
    fetch("/api/candidate/profile/me")
      .then((res) => res.json())
      .then((data) => setProfile(data.profile))
      .catch(() => {});
  }, []);

  return (
    <div className="max-w-xl mx-auto px-5 md:px-0 py-7 md:py-12">
      <h1 className="font-serif text-2xl md:text-3xl font-semibold mb-2">Edit your profile</h1>
      <p className="text-[13.5px] text-ink-faint mb-7">
        Tap any section to edit just that part -- no need to redo your whole profile.
      </p>

      <div className="space-y-2">
        {SECTIONS.map((section) => {
          const Icon = section.icon;
          return (
            <Link
              key={section.key}
              href={`/onboarding/candidate?step=${section.step}`}
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
          href="/candidate/settings/account"
          className="block text-center text-[13.5px] font-semibold text-coral-deep py-2"
        >
          Delete or deactivate account
        </Link>
      </div>
    </div>
  );
}
