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
  const sourceTypeFilter = params.source_type ?? "";

  // ── Scraped external jobs ──────────────────────────────────────────────────
  // Only fetched when tab is "all" or "external".
  let externalJobs: Job[] = [];
  if (sourceTypeFilter !== "internal") {
    let query = supabase
      .from("jobs")
      .select(
        "id, slug, title, practice_name, city, state, job_type, pay_min, pay_max, pay_unit, description, description_clean, source_url, source_platform, source_type, role_category, benefits, posted_date, status"
      )
      .eq("status", "active")
      .eq("source_type", "external")
      .limit(50);

    if (params.state)    query = query.eq("state", params.state.toUpperCase());
    if (params.city)     query = query.ilike("city", `%${params.city}%`);
    if (params.job_type) query = query.eq("job_type", params.job_type);
    if (params.role)     query = query.eq("role_category", params.role);
    if (params.pay_min) {
      const v = parseFloat(params.pay_min);
      if (!isNaN(v)) query = query.gte("pay_min", v);
    }

    const { data: raw, error } = await query;
    if (error) console.error("[candidate/browse] external jobs error:", error);
    externalJobs = (raw ?? []) as Job[];
  }

  // ── Native Hdenta job_postings ─────────────────────────────────────────────
  // Only fetched when tab is "all" or "internal".
  // Mapped to the shared Job interface so JobCard handles both with the
  // same component — source_type = "internal" triggers the teal styling
  // and in-platform apply button.
  let nativeJobs: Job[] = [];
  if (sourceTypeFilter !== "external") {
    let nativeQuery = supabase
      .from("job_postings")
      .select(
        `id, slug, title, city, state, employment_type, pay_min, pay_max, pay_unit,
         description, requirements, benefits, not_a_fit_if, status, created_at,
         role:roles(label),
         owner:practice_profiles(practice_name)`
      )
      .eq("status", "active")
      .limit(30);

    if (params.state)    nativeQuery = nativeQuery.eq("state", params.state.toUpperCase());
    if (params.city)     nativeQuery = nativeQuery.ilike("city", `%${params.city}%`);
    if (params.pay_min) {
      const v = parseFloat(params.pay_min);
      if (!isNaN(v)) nativeQuery = nativeQuery.gte("pay_min", v);
    }

    const { data: rawNative, error: nativeError } = await nativeQuery;
    if (nativeError) console.error("[candidate/browse] native jobs error:", nativeError);

    // Map job_postings → Job interface so JobCard can render them.
    nativeJobs = (rawNative ?? []).map((p) => ({
      id: p.id,
      slug: p.slug,
      title: p.title,
      // practice_name from the join — the owner chose whether to
      // display their name when setting up the posting; always show
      // for native listings since owners opted in by posting on Hdenta.
      practice_name:
        (p.owner as { practice_name?: string } | null)?.practice_name ?? null,
      city: p.city,
      state: p.state,
      // job_type maps to employment_type in job_postings; normalize to
      // the display values the JobCard already handles.
      job_type: p.employment_type?.replace("_", "-") ?? null,
      pay_min: p.pay_min,
      pay_max: p.pay_max,
      pay_unit: p.pay_unit,
      description: p.description,
      description_clean: null, // not stored separately for native posts
      source_url: `/jobs/${p.slug}`, // canonical URL for the detail page
      source_platform: "hdenta",
      source_type: "internal" as const,
      role_category:
        (p.role as { label?: string } | null)?.label ?? null,
      benefits: Array.isArray(p.benefits) ? p.benefits : [],
      posted_date: p.created_at?.slice(0, 10) ?? null,
      status: p.status,
      // Extra native-only fields passed through for the apply interstitial.
      not_a_fit_if: (p as { not_a_fit_if?: string }).not_a_fit_if ?? null,
      requirements: Array.isArray((p as { requirements?: unknown }).requirements)
        ? (p as { requirements: string[] }).requirements
        : [],
    }));
  }

  // Merge: native first (so "On Hdenta" listings lead), then external
  // sorted by posted_date desc.
  const externalSorted = externalJobs.sort((a, b) => {
    if (a.posted_date && b.posted_date) {
      return new Date(b.posted_date).getTime() - new Date(a.posted_date).getTime();
    }
    return 0;
  });

  const jobs: Job[] = [...nativeJobs, ...externalSorted];
  const internalCount = nativeJobs.length;

  return (
    <BrowseJobsClient
      initialJobs={jobs}
      internalCount={internalCount}
      currentParams={params}
      profileSummary={candidateProfile?.value_add_text ?? null}
      candidateId={user.id}
    />
  );
}
