"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function CandidateSettingsPage() {
  const [prefs, setPrefs] = useState({
    notification_email_messages: true,
    notification_email_invites: true,
    notification_email_match_alerts: true,
    notification_email_temp_jobs: true,
  });
  const [allowRosterAdd, setAllowRosterAdd] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) return;
      const { data: profile } = await supabase
        .from("profiles")
        .select("notification_email_messages, notification_email_invites, notification_email_match_alerts, notification_email_temp_jobs")
        .eq("id", data.user.id)
        .single();
      if (profile) setPrefs(profile);

      const { data: candidateProfile } = await supabase
        .from("candidate_profiles")
        .select("allow_roster_add")
        .eq("id", data.user.id)
        .maybeSingle();
      if (candidateProfile) setAllowRosterAdd(candidateProfile.allow_roster_add);
    });
  }, []);

  async function save() {
    setSaving(true);
    setSaved(false);
    const supabase = createClient();
    const { data } = await supabase.auth.getUser();
    if (data.user) {
      await supabase.from("profiles").update(prefs).eq("id", data.user.id);
      await supabase
        .from("candidate_profiles")
        .update({ allow_roster_add: allowRosterAdd })
        .eq("id", data.user.id);
      setSaved(true);
    }
    setSaving(false);
  }

  return (
    <div className="max-w-xl mx-auto px-5 md:px-0 py-7 md:py-12">
      <h1 className="font-serif text-2xl md:text-3xl font-semibold mb-7">Settings</h1>

      <div className="rounded-2xl border border-line bg-bg-raised p-5 mb-5">
        <p className="text-[14px] font-semibold mb-4">Email notifications</p>
        <div className="space-y-3.5">
          <Toggle
            label="New messages"
            checked={prefs.notification_email_messages}
            onChange={(v) => setPrefs((p) => ({ ...p, notification_email_messages: v }))}
          />
          <Toggle
            label="Interview invites"
            checked={prefs.notification_email_invites}
            onChange={(v) => setPrefs((p) => ({ ...p, notification_email_invites: v }))}
          />
          <Toggle
            label="Match alerts"
            checked={prefs.notification_email_match_alerts}
            onChange={(v) => setPrefs((p) => ({ ...p, notification_email_match_alerts: v }))}
          />
          <Toggle
            label="Temp job alerts"
            checked={prefs.notification_email_temp_jobs}
            onChange={(v) => setPrefs((p) => ({ ...p, notification_email_temp_jobs: v }))}
          />
        </div>
        <p className="text-[12px] text-ink-faint mt-4 leading-relaxed">
          Email is how you&apos;ll hear from ChairMatch — you&apos;ll always see these in your
          notification bell too, even with email off for a category.
        </p>
      </div>

      <div className="rounded-2xl border border-line bg-bg-raised p-5 mb-5">
        <Toggle
          label="Allow practices to add me to their team roster"
          checked={allowRosterAdd}
          onChange={setAllowRosterAdd}
        />
        <p className="text-[12px] text-ink-faint mt-2.5 leading-relaxed">
          Practices can pre-add you to a private shortlist before ever contacting you. Turning this off prevents that -- they&apos;d still see your profile in search, just couldn&apos;t add you to their roster.
        </p>
      </div>

      <button
        onClick={save}
        disabled={saving}
        className="w-full bg-teal disabled:opacity-60 text-white font-semibold text-[14.5px] py-3 rounded-control hover:bg-teal-deep transition-colors mb-3"
      >
        {saving ? "Saving…" : saved ? "Saved ✓" : "Save changes"}
      </button>

      <Link href="/candidate/settings/edit" className="block text-center text-teal-deep font-semibold text-[13.5px] py-2">
        Edit your profile
      </Link>
    </div>
  );
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center justify-between cursor-pointer">
      <span className="text-[14px]">{label}</span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="w-4.5 h-4.5 rounded accent-teal"
      />
    </label>
  );
}
