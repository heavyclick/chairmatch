import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

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
  }

  return NextResponse.redirect(new URL("/candidate/dashboard", request.url));
}
