import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

function generateSlug(title: string, suffix: string): string {
  const base = `${title} ${suffix}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);
  const rand = Math.random().toString(36).slice(2, 7);
  return `${base}-${rand}`;
}

export async function GET() {
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { data: postings, error } = await supabase
    .from("job_postings")
    .select(
      `id, slug, title, employment_type, city, state, status,
       expires_at, created_at, updated_at,
       role:roles(label),
       applications:job_applications(id, status)`
    )
    .eq("owner_id", authData.user.id)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const enriched = (postings ?? []).map((p) => {
    const apps = Array.isArray(p.applications) ? p.applications : [];
    return {
      ...p,
      applicant_count: apps.length,
      pending_count: apps.filter((a: { status: string }) => a.status === "pending").length,
      applications: undefined,
    };
  });

  return NextResponse.json({ postings: enriched });
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const body = await request.json();
  const {
    title,
    role_id,
    employment_type,
    city,
    state,
    zip,
    pay_min,
    pay_max,
    pay_unit,
    description,
    requirements,
    benefits,
    not_a_fit_if,
    status = "draft",
  } = body;

  if (!title?.trim()) {
    return NextResponse.json({ error: "Title is required" }, { status: 400 });
  }
  if (!["draft", "active"].includes(status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  // Fetch practice profile — optional for drafts, required for publish.
  const { data: practice } = await supabase
    .from("practice_profiles")
    .select("practice_name, job_posting_subscription_active, city, state")
    .eq("id", authData.user.id)
    .maybeSingle();

  // Subscription gate — only enforced when publishing (status = "active").
  // Drafts are always allowed so owners can prepare a posting before subscribing.
  if (status === "active" && !practice?.job_posting_subscription_active) {
    return NextResponse.json(
      { error: "Job posting subscription required", code: "subscription_required" },
      { status: 403 }
    );
  }

  const slugBase = practice?.practice_name ?? authData.user.id.slice(0, 8);
  const slug = generateSlug(title, slugBase);
  const now = new Date().toISOString();
  const expires_at = status === "active"
    ? new Date(Date.now() + 30 * 86400000).toISOString()
    : null;

  const { data: posting, error } = await supabase
    .from("job_postings")
    .insert({
      owner_id: authData.user.id,
      slug,
      title: title.trim(),
      role_id: role_id ?? null,
      employment_type: employment_type ?? null,
      city: city ?? practice?.city ?? null,
      state: state ?? practice?.state ?? null,
      zip: zip ?? null,
      pay_min: pay_min ?? null,
      pay_max: pay_max ?? null,
      pay_unit: pay_unit ?? null,
      description: description?.trim() ?? null,
      requirements: requirements ?? [],
      benefits: benefits ?? [],
      not_a_fit_if: not_a_fit_if?.trim() ?? null,
      status,
      expires_at,
      created_at: now,
      updated_at: now,
    })
    .select("id, slug, status")
    .single();

  if (error) {
    console.error("[/api/owner/job-postings POST]", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ posting }, { status: 201 });
}
