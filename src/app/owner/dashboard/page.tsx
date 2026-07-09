import Link from "next/link";
import { Star, ArrowRight } from "lucide-react";
import { DashboardStatHero } from "@/components/owner/dashboard-stat-hero";
import { createClient } from "@/lib/supabase/server";

export default async function OwnerDashboardPage() {
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getUser();

  let practiceName = "your practice";
  let city = "your area";
  let radiusMiles = 15;
  let savedSearches: { id: string; label: string | null; new_match_count: number }[] = [];
  let stats: { label: string; count: number }[] = [];

  if (authData.user) {
    const { data: practice } = await supabase
      .from("practice_profiles")
      .select("practice_name, locations:practice_locations(city, radius_miles, is_primary)")
      .eq("id", authData.user.id)
      .maybeSingle();

    if (practice) {
      practiceName = practice.practice_name;
      const locations = Array.isArray(practice.locations) ? practice.locations : practice.locations ? [practice.locations] : [];
      const loc = locations.find((l) => l.is_primary) ?? locations[0];
      if (loc) {
        city = loc.city ?? city;
        radiusMiles = loc.radius_miles ?? radiusMiles;
      }
    }

    const { data: alerts } = await supabase
      .from("match_alerts")
      .select("id, label")
      .eq("owner_id", authData.user.id)
      .order("created_at", { ascending: false })
      .limit(6);

    let matchCounts = new Map<string, number>();
    if (alerts && alerts.length > 0) {
      const { data: notifications } = await supabase
        .from("match_alert_notifications")
        .select("alert_id")
        .in("alert_id", alerts.map((a) => a.id));
      matchCounts = new Map();
      for (const n of notifications ?? []) {
        matchCounts.set(n.alert_id, (matchCounts.get(n.alert_id) ?? 0) + 1);
      }
    }
    savedSearches = (alerts ?? []).map((a) => ({ ...a, new_match_count: matchCounts.get(a.id) ?? 0 }));

    // Real radius search when this practice's location has been
    // geocoded (candidates_within_radius_of_practice, migration 0015)
    // -- previously this always matched on exact city text regardless
    // of the radius value shown in the UI, which meant editing the
    // radius control had zero actual effect on these numbers.
    const { data: hasLocation } = await supabase.rpc("practice_has_geocoded_location", {
      practice_id_input: authData.user.id,
    });
    let radiusMatchedIds: string[] | null = null;
    if (hasLocation) {
      const { data: withinRadius } = await supabase.rpc("candidates_within_radius_of_practice", {
        practice_id_input: authData.user.id,
        radius_miles: radiusMiles,
      });
      radiusMatchedIds = (withinRadius ?? []).map((c: { id: string }) => c.id);
    }

    const { data: roles } = await supabase.from("roles").select("id, label");
    if (roles) {
      const counts = await Promise.all(
        roles.map(async (r) => {
          let roleQuery = supabase
            .from("candidate_profiles")
            .select("id", { count: "exact", head: true })
            .eq("primary_role_id", r.id)
            .eq("visibility_status", "actively_looking");
          roleQuery = radiusMatchedIds ? roleQuery.in("id", radiusMatchedIds) : roleQuery.eq("city", city);
          const { count } = await roleQuery;
          return { label: r.label, count: count ?? 0 };
        })
      );
      stats = counts.filter((c) => c.count > 0).sort((a, b) => b.count - a.count).slice(0, 4);
    }
  }

  return (
    <div className="max-w-5xl mx-auto px-5 md:px-10 py-7 md:py-12">
      <div className="mb-7 md:mb-10">
        <p className="text-[13px] text-ink-faint mb-1">Good morning,</p>
        <h1 className="font-serif text-2xl md:text-3xl font-bold">{practiceName}</h1>
      </div>

      <div className="mb-12 md:mb-14">
        <DashboardStatHero
          initialCity={city}
          initialRadiusMiles={radiusMiles}
          stats={
            stats.length > 0
              ? stats
              : [{ label: "No active candidates yet in this city", count: 0 }]
          }
        />
      </div>

      <div className="flex items-center justify-between mb-5">
        <h2 className="text-[15px] font-semibold">Match alerts</h2>
        <Link href="/owner/saved-searches" className="text-[13px] font-semibold text-teal-deep flex items-center gap-1">
          Manage alerts <ArrowRight size={13} />
        </Link>
      </div>

      {savedSearches.length === 0 ? (
        <div className="rounded-xl border border-dashed border-line p-6 text-center text-[13.5px] text-ink-faint mb-10">
          No active alerts yet.{" "}
          <Link href="/owner/saved-searches" className="text-teal-deep font-semibold">
            Create one
          </Link>{" "}
          to get notified when a matching candidate joins.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-10">
          {savedSearches.map((s) => (
            <Link
              key={s.id}
              href="/owner/saved-searches"
              className="rounded-xl border border-line bg-bg-raised p-4 hover:border-teal transition-colors block"
            >
              <div className="flex items-center gap-2 mb-1.5">
                <Star size={13} className="text-teal-deep" />
                <span className="text-[14px] font-semibold">{s.label || "Match alert"}</span>
              </div>
            </Link>
          ))}
        </div>
      )}

      <Link
        href="/owner/profile"
        className="flex items-center justify-center gap-2 w-full text-center border border-line font-semibold text-[14.5px] py-3.5 rounded-control hover:border-teal transition-colors mb-3"
      >
        View your full practice profile
      </Link>
      <Link
        href="/owner/browse"
        className="block w-full text-center bg-teal text-white font-semibold text-[14.5px] py-3.5 rounded-control hover:bg-teal-deep transition-colors"
      >
        Browse candidates
      </Link>
    </div>
  );
}
