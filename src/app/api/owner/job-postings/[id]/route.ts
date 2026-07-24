import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { notifyUser } from "@/lib/notifications/create";

/**
 * GET /api/owner/job-postings/[id]
 * Full posting detail + applicant list for the owner's /owner/jobs/[id]
 * page. Returns the posting fields plus every application with the
 * candidate's profile summary.
 *
 * PATCH /api/owner/job-postings/[id]
 * Edit a posting or change its status (active ↔ paused, or publish a
 * draft). Activating resets expires_at to 30 days from now. Also
 * handles updating an individual application's status (owner reviewing
 * applicants) when body contains { application_id, application_status }.
 *
 * DELETE /api/owner/job-postings/[id]
 * Hard-delete a posting. Applications cascade-delete via FK.
 */

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { data: posting, error } = await supabase
    .from("job_postings")
    .select(
      `*, role:roles(label),
       applications:job_applications(
         id, status, cover_note, created_at,
         candidate:candidate_profiles(
           id, full_name, photo_url, city, state,
           years_experience, pay_range_min, pay_range_max,
           value_add_text,
           role:roles(label)
         )
       )`
    )
    .eq("id", id)
    .eq("owner_id", authData.user.id)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!posting) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ posting });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const serviceSupabase = createServiceClient();
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const body = await request.json();

  // ── Application status update (owner reviewing applicants) ────────────────
  if (body.application_id && body.application_status) {
    const validStatuses = ["pending", "reviewed", "hired", "rejected"];
    if (!validStatuses.includes(body.application_status)) {
      return NextResponse.json({ error: "Invalid application_status" }, { status: 400 });
    }

    // Verify the application belongs to a posting owned by this user
    // before updating -- the RLS policy does this too, but an explicit
    // check surfaces a clear 404 rather than a silent empty update.
    const { data: app } = await supabase
      .from("job_applications")
      .select("id, applicant_id, job_postings!inner(owner_id)")
      .eq("id", body.application_id)
      .eq("job_postings.owner_id", authData.user.id)
      .maybeSingle();

    if (!app) {
      return NextResponse.json({ error: "Application not found" }, { status: 404 });
    }

    const { error: appError } = await supabase
      .from("job_applications")
      .update({ status: body.application_status })
      .eq("id", body.application_id);

    if (appError) {
      return NextResponse.json({ error: appError.message }, { status: 500 });
    }

    // Notify the candidate their status changed.
    const { data: posting } = await supabase
      .from("job_postings")
      .select("title")
      .eq("id", id)
      .maybeSingle();

    const statusLabel: Record<string, string> = {
      reviewed: "Reviewed",
      hired: "Hired 🎉",
      rejected: "Not moving forward",
    };
    const label = statusLabel[body.application_status];
    if (label && app.applicant_id) {
      await notifyUser(serviceSupabase, {
        userId: app.applicant_id,
        type: "job_application_status" as never, // extended type -- see notifications/create.ts note
        title: `Application update: ${posting?.title ?? "your application"}`,
        body: `Status changed to: ${label}`,
        link: "/candidate/messages",
      });
    }

    return NextResponse.json({ ok: true });
  }

  // ── Posting field update ───────────────────────────────────────────────────
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
    status,
  } = body;

  if (status && !["draft", "active", "paused", "expired"].includes(status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (title !== undefined)          updates.title = title?.trim();
  if (role_id !== undefined)        updates.role_id = role_id;
  if (employment_type !== undefined) updates.employment_type = employment_type;
  if (city !== undefined)           updates.city = city;
  if (state !== undefined)          updates.state = state;
  if (zip !== undefined)            updates.zip = zip;
  if (pay_min !== undefined)        updates.pay_min = pay_min;
  if (pay_max !== undefined)        updates.pay_max = pay_max;
  if (pay_unit !== undefined)       updates.pay_unit = pay_unit;
  if (description !== undefined)    updates.description = description?.trim();
  if (requirements !== undefined)   updates.requirements = requirements;
  if (benefits !== undefined)       updates.benefits = benefits;
  if (not_a_fit_if !== undefined)   updates.not_a_fit_if = not_a_fit_if?.trim();

  if (status !== undefined) {
    updates.status = status;
    // Activating (from draft or paused) resets the 30-day expiry clock.
    if (status === "active") {
      updates.expires_at = new Date(Date.now() + 30 * 86400000).toISOString();
    }
    // Pausing preserves expires_at -- if they reactivate before it
    // would have expired, they still get the remainder. The cron only
    // expires rows where status = 'active', so paused rows are safe.
  }

  const { data: posting, error } = await supabase
    .from("job_postings")
    .update(updates)
    .eq("id", id)
    .eq("owner_id", authData.user.id)
    .select("id, slug, status, expires_at")
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!posting) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ posting });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { error } = await supabase
    .from("job_postings")
    .delete()
    .eq("id", id)
    .eq("owner_id", authData.user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
