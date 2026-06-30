import { createClient } from "@/lib/supabase/server";

/**
 * Server-side helper for getting the current user + their account type.
 * Use in Server Components / Route Handlers to branch owner-vs-candidate
 * logic without re-querying profiles everywhere by hand.
 */
export async function getCurrentUser() {
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getUser();

  if (!authData.user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", authData.user.id)
    .single();

  return profile
    ? { ...profile, authUser: authData.user }
    : { id: authData.user.id, authUser: authData.user, account_type: null as null };
}
