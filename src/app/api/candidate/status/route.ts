import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { checkMatchAlertsForCandidate } from "@/lib/match-alerts/check-and-notify";

/**
 * POST /api/candidate/status
 *
 * Updates visibility_status (actively_looking / open / off_market).
 * Accepts a form POST (the dashboard's status buttons submit a plain
 * <form>, no JS fetch needed) and redirects back to the dashboard.
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getUser();

  if (!authData.user) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const formData = await request.formData();
  const status = formData.get("status");

  if (status === "actively_looking" || status === "open" || status === "off_market") {
    await supabase
      .from("candidate_profiles")
      .update({ visibility_status: status })
      .eq("id", authData.user.id);

    if (status === "actively_looking") {
      // Awaited, not fire-and-forget -- on Vercel's serverless runtime
      // a background promise left running after the response is sent
      // can simply be killed, which would make this silently never run
      // in production despite working fine in local dev's long-lived
      // process. The extra latency here is small (one candidate against
      // N stored alerts, in-memory) and correctness matters more.
      try {
        await checkMatchAlertsForCandidate(createServiceClient(), authData.user.id);
      } catch (err) {
        console.error("[/api/candidate/status] match alert check failed:", err);
      }
    }
  }

  return NextResponse.redirect(new URL("/candidate/dashboard", request.url));
}
