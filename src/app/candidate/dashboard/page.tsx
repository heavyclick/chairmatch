import Link from "next/link";
import { Eye, MessageSquare, Sparkles, User } from "lucide-react";
import { createClient } from "@/lib/supabase/server";

const STATUS_LABELS = {
  actively_looking: { label: "Actively looking", color: "bg-teal-tint text-teal-deep" },
  open: { label: "Open to offers", color: "bg-line-soft text-ink-soft" },
  off_market: { label: "Off the market", color: "bg-line text-ink-faint" },
};

function daysSince(isoDate: string): number {
  return Math.floor((Date.now() - new Date(isoDate).getTime()) / 86400000);
}

function oneWeekAgoIso(): string {
  return new Date(Date.now() - 7 * 86400000).toISOString();
}

export default async function CandidateDashboardPage() {
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getUser();

  let profile: { full_name: string; visibility_status: keyof typeof STATUS_LABELS; profile_completeness_score: number; updated_at: string } | null = null;
  let threadCount = 0;
  let viewersThisWeek: { viewer_practice_id: string; practice: { practice_name: string; photo_url: string | null } | null }[] = [];
  let totalViewsThisWeek = 0;

  if (authData.user) {
    const { data } = await supabase
      .from("candidate_profiles")
      .select("full_name, visibility_status, profile_completeness_score, updated_at")
      .eq("id", authData.user.id)
      .maybeSingle();
    profile = data;

    const { count } = await supabase
      .from("message_threads")
      .select("id", { count: "exact", head: true })
      .eq("candidate_id", authData.user.id);
    threadCount = count ?? 0;

    // Real profile view tracking -- previously this entire stat was a
    // hardcoded "-" with no underlying data at all. See migration 0002
    // (profile_views table) and the logging added to
    // /api/candidate/[id]/route.ts.
    const { data: views } = await supabase
      .from("profile_views")
      .select("viewer_practice_id, practice:practice_profiles(practice_name, photo_url)")
      .eq("candidate_id", authData.user.id)
      .gte("viewed_at", oneWeekAgoIso())
      .order("viewed_at", { ascending: false });

    totalViewsThisWeek = views?.length ?? 0;
    const seen = new Set<string>();
    viewersThisWeek = (views ?? [])
      .filter((v) => {
        if (seen.has(v.viewer_practice_id)) return false;
        seen.add(v.viewer_practice_id);
        return true;
      })
      .map((v) => ({
        viewer_practice_id: v.viewer_practice_id,
        practice: Array.isArray(v.practice) ? v.practice[0] ?? null : v.practice,
      }));
  }

  const daysSinceUpdate = profile ? daysSince(profile.updated_at) : null;

  return (
    <div className="max-w-2xl mx-auto px-5 md:px-0 py-7 md:py-12">
      <p className="text-[13px] text-ink-faint mb-1">Welcome back</p>
      <h1 className="font-serif text-2xl md:text-3xl font-bold mb-8">
        {profile?.full_name ?? "Your dashboard"}
      </h1>

      {!profile && (
        <div className="rounded-xl border border-dashed border-line p-6 text-center mb-8">
          <p className="text-[14px] mb-3">You haven&apos;t finished setting up your profile yet.</p>
          <Link href="/onboarding/candidate" className="text-teal-deep font-semibold text-[14px]">
            Finish your profile →
          </Link>
        </div>
      )}

      {profile && (
        <>
          {/* Status control -- the single most important control on this page */}
          <div className="rounded-2xl border border-line bg-bg-raised p-5 mb-6">
            <p className="text-[13px] font-semibold text-ink-soft mb-3">Your status</p>
            <div className="flex gap-2">
              {(Object.keys(STATUS_LABELS) as Array<keyof typeof STATUS_LABELS>).map((key) => (
                <StatusButton key={key} statusKey={key} active={profile!.visibility_status === key} />
              ))}
            </div>
          </div>

          {/* This week stats -- profile views are now clickable, showing
              WHO viewed (practice name + link to their profile), not
              just a bare count. */}
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div className="rounded-2xl border border-line bg-bg-raised p-5">
              <Eye size={16} className="text-teal-deep mb-2" />
              <div className="font-serif text-2xl font-semibold">{totalViewsThisWeek}</div>
              <div className="text-[12.5px] text-ink-faint">Profile views this week</div>
            </div>
            <div className="rounded-2xl border border-line bg-bg-raised p-5">
              <MessageSquare size={16} className="text-teal-deep mb-2" />
              <div className="font-serif text-2xl font-semibold">{threadCount}</div>
              <div className="text-[12.5px] text-ink-faint">Conversations</div>
            </div>
          </div>

          {viewersThisWeek.length > 0 && (
            <div className="rounded-2xl border border-line bg-bg-raised p-4 mb-6">
              <p className="text-[12.5px] font-semibold text-ink-soft mb-2.5 px-1">Viewed by</p>
              <div className="space-y-1">
                {viewersThisWeek.map((v) => (
                  <Link
                    key={v.viewer_practice_id}
                    href={`/candidate/practice/${v.viewer_practice_id}`}
                    className="flex items-center gap-2.5 px-2 py-2 rounded-lg hover:bg-line-soft transition-colors"
                  >
                    <div className="w-7 h-7 rounded-full bg-teal-tint flex items-center justify-center text-teal-deep text-[11px] font-semibold shrink-0">
                      {v.practice?.practice_name?.[0] ?? "?"}
                    </div>
                    <span className="text-[13.5px] font-medium">{v.practice?.practice_name}</span>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Freshness nudge */}
          {daysSinceUpdate !== null && daysSinceUpdate > 90 && (
            <div className="rounded-xl bg-coral/10 border border-coral/20 p-4 mb-6 flex items-start gap-3">
              <Sparkles size={15} className="text-coral-deep mt-0.5 shrink-0" />
              <p className="text-[13.5px] text-ink leading-relaxed">
                Your profile hasn&apos;t been updated in {daysSinceUpdate} days. Practices prioritize recently active profiles —{" "}
                <Link href="/candidate/settings/edit" className="text-coral-deep font-semibold">
                  give it a refresh
                </Link>
                .
              </p>
            </div>
          )}

          <Link
            href="/candidate/profile"
            className="flex items-center justify-center gap-2 w-full text-center border border-line font-semibold text-[14.5px] py-3.5 rounded-control hover:border-teal transition-colors mb-3"
          >
            <User size={15} /> View your full profile
          </Link>
          <Link
            href="/candidate/browse-preview"
            className="flex items-center justify-center gap-2 w-full text-center border border-line font-semibold text-[14.5px] py-3.5 rounded-control hover:border-teal transition-colors mb-3"
          >
            <Eye size={15} /> See it from a practice&apos;s side
          </Link>
          <Link
            href="/candidate/messages"
            className="block w-full text-center bg-teal text-white font-semibold text-[14.5px] py-3.5 rounded-control hover:bg-teal-deep transition-colors mb-3"
          >
            View messages
          </Link>
          <Link
            href="/candidate/settings/edit"
            className="block w-full text-center border border-line font-semibold text-[14.5px] py-3.5 rounded-control hover:border-teal transition-colors"
          >
            Edit profile
          </Link>
        </>
      )}
    </div>
  );
}

function StatusButton({
  statusKey,
  active,
}: {
  statusKey: keyof typeof STATUS_LABELS;
  active: boolean;
}) {
  const { label, color } = STATUS_LABELS[statusKey];
  return (
    <form action="/api/candidate/status" method="POST" className="flex-1">
      <input type="hidden" name="status" value={statusKey} />
      <button
        type="submit"
        className={`w-full text-[12.5px] font-semibold py-2 rounded-lg transition-colors ${
          active ? color : "text-ink-faint hover:bg-line-soft"
        }`}
      >
        {label}
      </button>
    </form>
  );
}
