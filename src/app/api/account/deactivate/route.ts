import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";

/**
 * POST /api/account/deactivate
 * body: { action: "deactivate" | "delete" }
 *
 * Deactivate: sets visibility_status to off_market (candidates) so the
 * profile stops surfacing in search, without destroying any data --
 * reversible by the person themselves just by changing status back.
 *
 * Delete: permanently removes the auth user and lets the `on delete
 * cascade` foreign keys throughout the schema clean up every
 * candidate_profiles/practice_profiles row and all of its related
 * join-table data. This is genuinely destructive and irreversible,
 * which is why it requires the service-role client (deleting an
 * auth.users row isn't something the regular client/RLS setup allows
 * a user to do to themselves directly).
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { action } = await request.json();

  if (action === "deactivate") {
    const { data: profile } = await supabase
      .from("profiles")
      .select("account_type")
      .eq("id", authData.user.id)
      .single();

    if (profile?.account_type === "candidate") {
      await supabase
        .from("candidate_profiles")
        .update({ visibility_status: "off_market" })
        .eq("id", authData.user.id);
    }
    // Owners don't have an equivalent "visibility" concept to toggle --
    // deactivating an owner account mainly matters for billing/access,
    // which is handled by simply not renewing a subscription. No
    // additional state change needed here for the owner case.

    return NextResponse.json({ success: true, action: "deactivated" });
  }

  if (action === "delete") {
    const serviceClient = createServiceClient();
    const { error } = await serviceClient.auth.admin.deleteUser(authData.user.id);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    await supabase.auth.signOut();
    return NextResponse.json({ success: true, action: "deleted" });
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}
