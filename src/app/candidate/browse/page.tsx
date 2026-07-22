// src/app/candidate/browse/page.tsx

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { BrowseJobsClient } from "./browse-jobs-client";
import type { Job } from "@/components/candidate/job-card";

interface SearchParams {
  state?: string;
  city?: string;
  job_type?: string;
  pay_min?: string;
  role?: string;
  source_type?: string;
}

export default async function CandidateBrowsePage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("account_type")
    .eq("id", user.id)
    .single();

  if (profile?.account_type === "owner") redirect("/owner/browse");

  // Fetch candidate's value_add_text for the apply interstitial
  const { data: candidateProfile } = await supabase
    .from("candidate_profiles")
    .select("value_add_text")
    .eq("id", user.id)
    .maybeSingle();

  const params = await searchParams;

  // ── Query using actual column names ───────────────────────────────────────
  let query = supabase
    .from("jobs")
    .select(
      "id, slug, title, practice_name, city, state, job_type, pay_min, pay_max, pay_unit, description, description_clean, source_url, source_platform, source_type, role_category, benefits, posted_date, status"
    )
    .eq("status", "active")  // only show active listings
    .limit(60);

  if (params.state)      query = query.eq("state", params.state.toUpperCase());
  if (params.city)       query = query.ilike("city", `%${params.city}%`);
  if (params.job_type)   query = query.eq("job_type", params.job_type);
  if (params.role)       query = query.eq("role_category", params.role);
  if (params.source_type) query = query.eq("source_type", params.source_type);
  if (params.pay_min) {
    const v = parseFloat(params.pay_min);
    if (!isNaN(v)) query = query.gte("pay_min", v);
  }

  const { data: rawJobs, error } = await query;
  if (error) console.error("[candidate/browse]", error);

  // Sort: internal first, then most recently posted
  const jobs: Job[] = (rawJobs ?? []).sort((a, b) => {
    if (a.source_type === "internal" && b.source_type !== "internal") return -1;
    if (b.source_type === "internal" && a.source_type !== "internal") return 1;
    if (a.posted_date && b.posted_date)
      return new Date(b.posted_date).getTime() - new Date(a.posted_date).getTime();
    return 0;
  });

  const internalCount = jobs.filter((j) => j.source_type === "internal").length;

  return (
    <BrowseJobsClient
      initialJobs={jobs}
      internalCount={internalCount}
      currentParams={params}
      profileSummary={candidateProfile?.value_add_text ?? null}
    />
  );
}
