import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

/**
 * POST /api/jobs/ingest
 *
 * Receives daily batches of scraped external job postings from a
 * separate scraper service (runs independently, outside this
 * codebase). Auth is a single shared bearer secret (HDENTA_INGEST_SECRET)
 * -- not Supabase auth at all, since the caller isn't a Hdenta user,
 * it's a trusted external service. Mirrors the same
 * "Authorization: Bearer <secret>" pattern already used for
 * src/app/api/cron/sync-google-ratings/route.ts's Vercel Cron auth,
 * just with a different, dedicated secret.
 *
 * Dedup logic: source_url has a unique constraint at the DB level
 * (see supabase/migrations/0026_jobs_table.sql), so a duplicate
 * insert attempt fails with a unique-violation rather than silently
 * overwriting -- caught per-row below and counted as "skipped" rather
 * than aborting the whole batch. The scraper generates and owns the
 * slug (hdenta_slug in the request body) -- this route stores it
 * exactly as received, never regenerates or modifies it, since the
 * scraper already builds Telegram links pointing at
 * hdenta.com/jobs/<that exact slug> before ever sending the request.
 *
 * Test locally with:
 *   curl -X POST http://localhost:3000/api/jobs/ingest \
 *     -H "Authorization: Bearer $HDENTA_INGEST_SECRET" \
 *     -H "Content-Type: application/json" \
 *     -d '{"jobs":[{"source_platform":"Indeed","source_url":"https://indeed.com/viewjob?jk=test1","title":"Dental Hygienist","hdenta_slug":"test-hygienist-1"}]}'
 */

interface IncomingJob {
  source_platform?: string;
  source_url: string;
  title: string;
  practice_name?: string;
  location?: { city?: string; state?: string; zip?: string };
  job_type?: string;
  pay?: { min?: number; max?: number; unit?: string };
  description?: string;
  requirements?: string[];
  benefits?: string[];
  posted_date?: string;
  scraped_at?: string;
  hdenta_slug: string;
}

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const expected = process.env.HDENTA_INGEST_SECRET ? `Bearer ${process.env.HDENTA_INGEST_SECRET}` : null;

  if (!expected || authHeader !== expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { jobs?: IncomingJob[] };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const jobs = body.jobs ?? [];
  const errors: string[] = [];
  let inserted = 0;
  let skipped = 0;

  const supabase = createServiceClient();

  for (const job of jobs) {
    if (!job.source_url || !job.title || !job.hdenta_slug) {
      errors.push(`Skipped a job missing source_url/title/hdenta_slug: ${JSON.stringify(job).slice(0, 120)}`);
      continue;
    }

    const { error } = await supabase.from("jobs").insert({
      slug: job.hdenta_slug,
      title: job.title,
      practice_name: job.practice_name ?? null,
      city: job.location?.city ?? null,
      state: job.location?.state ?? null,
      zip: job.location?.zip ?? null,
      job_type: job.job_type ?? null,
      pay_min: job.pay?.min ?? null,
      pay_max: job.pay?.max ?? null,
      pay_unit: job.pay?.unit ?? null,
      description: job.description ?? null,
      requirements: job.requirements ?? [],
      benefits: job.benefits ?? [],
      source_platform: job.source_platform ?? null,
      source_url: job.source_url,
      posted_date: job.posted_date ?? null,
      scraped_at: job.scraped_at ?? new Date().toISOString(),
      status: "active",
    });

    if (error) {
      // Postgres unique-violation code -- source_url (or slug)
      // already exists, which is the expected, normal "already have
      // this one" case, not a real error. Anything else genuinely is.
      if (error.code === "23505") {
        skipped++;
      } else {
        errors.push(`${job.source_url}: ${error.message}`);
      }
    } else {
      inserted++;
    }
  }

  return NextResponse.json({
    received: jobs.length,
    inserted,
    skipped,
    errors,
  });
}
