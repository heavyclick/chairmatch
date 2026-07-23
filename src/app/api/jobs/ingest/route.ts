// src/app/api/jobs/ingest/route.ts
//
// Corrected to match actual jobs table column names:
//   practice_name (not company)
//   city / state (not location_city / location_state)
//   source_url (not apply_url)
//   source_platform (not source)
//   pay_unit (not pay_period)
//   posted_date (not posted_at) — type: date string "YYYY-MM-DD"
//   benefits — jsonb (send as object or array, stored as jsonb)
//   requirements — jsonb (existing field, now included)

import { createServiceClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export interface IngestJob {
  // Required
  slug: string;           // deterministic unique ID — see WELLS_INTEGRATION.md
  title: string;
  practice_name: string;  // was "company" in old spec — now matches DB column
  city: string;
  state: string;          // 2-letter: "TX", "CA", "AR"
  source_url: string;     // was "apply_url" — direct application URL
  source_platform: string; // was "source" — "glassdoor" | "simplyhired" | "linkedin" | "indeed" | "ziprecruiter"

  // Strongly recommended
  description?: string | null;        // raw description (may include HTML)
  description_clean?: string | null;  // plain text, HTML stripped, \n\n paragraphs
  job_type?: "full-time" | "part-time" | "temp" | "per-diem" | null;
  pay_min?: number | null;
  pay_max?: number | null;
  pay_unit?: "hourly" | "annual" | "monthly" | null;  // was "pay_period"
  posted_date?: string | null;   // "YYYY-MM-DD" date string (matches DB column type)
  expires_at?: string | null;    // ISO 8601

  // Optional enrichment
  source_type?: "internal" | "external";
  role_category?: string | null;
  requirements?: Record<string, unknown> | string[] | null;  // jsonb
  benefits?: Record<string, unknown> | string[] | null;      // jsonb
  zip?: string | null;
  status?: string;  // defaults to "active"
}

function isAuthorized(req: NextRequest): boolean {
  const secret = process.env.HDENTA_INGEST_SECRET;
  if (!secret) return false;
  return req.headers.get("authorization") === `Bearer ${secret}`;
}

function validate(job: IngestJob): string | null {
  if (!job.slug?.trim()) return "missing: slug";
  if (!job.title?.trim()) return "missing: title";
  if (!job.practice_name?.trim()) return "missing: practice_name";
  if (!job.city?.trim()) return "missing: city";
  if (!job.state?.trim()) return "missing: state";
  if (!job.source_url?.trim()) return "missing: source_url";
  if (!job.source_platform?.trim()) return "missing: source_platform";
  return null;
}

function normalize(job: IngestJob) {
  return {
    slug:             job.slug.trim().toLowerCase(),
    title:            job.title.trim(),
    practice_name:    job.practice_name.trim(),
    city:             job.city.trim(),
    state:            job.state.trim().toUpperCase(),
    zip:              job.zip?.trim() ?? null,
    source_url:       job.source_url.trim(),
    source_platform:  job.source_platform.trim().toLowerCase(),
    source_type:      job.source_type ?? "external",
    description:      job.description?.trim() ?? null,
    description_clean: job.description_clean?.trim() ?? null,
    job_type:         job.job_type ?? null,
    pay_min:          job.pay_min ?? null,
    pay_max:          job.pay_max ?? null,
    pay_unit:         job.pay_unit ?? null,
    posted_date:      job.posted_date ?? null,  // "YYYY-MM-DD"
    expires_at:       job.expires_at ?? null,
    role_category:    job.role_category ?? null,
    requirements:     job.requirements ?? null,
    benefits:         job.benefits ?? null,
    status:           job.status ?? "active",
    updated_at:       new Date().toISOString(),
  };
}

export async function POST(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: IngestJob | IngestJob[];
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const jobs = Array.isArray(body) ? body : [body];
  if (jobs.length === 0)
    return NextResponse.json({ error: "Empty payload" }, { status: 400 });
  if (jobs.length > 500)
    return NextResponse.json({ error: "Max 500 per request" }, { status: 400 });

  const errors: { index: number; slug?: string; error: string }[] = [];
  for (let i = 0; i < jobs.length; i++) {
    const err = validate(jobs[i]);
    if (err) errors.push({ index: i, slug: jobs[i]?.slug, error: err });
  }
  if (errors.length > 0) {
    return NextResponse.json({ error: "Validation failed", details: errors }, { status: 422 });
  }

  const rows = jobs.map(normalize);
  const supabase = await createServiceClient();

  // upsert on slug — safe to re-run backfill any number of times
  const { data, error } = await supabase
    .from("jobs")
    .upsert(rows, { onConflict: "slug" })
    .select("slug");

  if (error) {
    console.error("[jobs/ingest] upsert error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    upserted: data?.length ?? rows.length,
    slugs: data?.map((r) => r.slug) ?? [],
  });
}
