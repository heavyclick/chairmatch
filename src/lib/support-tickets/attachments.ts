import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

export interface TicketAttachment {
  path: string;
  name: string;
  size: number;
}

const SIGNED_URL_EXPIRY_SECONDS = 30 * 24 * 60 * 60; // 30 days -- long enough for the founder to work through a ticket without the link dying mid-conversation, short enough not to be a permanent public link

/**
 * Turns stored attachment paths into time-limited signed URLs for the
 * support-attachments bucket (private -- see migration 0017 for why).
 * Must be called with the service-role client, since the bucket's own
 * RLS only lets each user read their own uploads, but the founder
 * (no matching auth session) needs to open these from an email link.
 */
export async function getSignedAttachmentUrls(
  supabase: SupabaseClient<Database>,
  attachments: TicketAttachment[]
): Promise<(TicketAttachment & { signedUrl: string | null })[]> {
  return Promise.all(
    attachments.map(async (a) => {
      const { data, error } = await supabase.storage
        .from("support-attachments")
        .createSignedUrl(a.path, SIGNED_URL_EXPIRY_SECONDS);
      if (error) {
        console.error(`[support-tickets] failed to sign URL for ${a.path}:`, error);
        return { ...a, signedUrl: null };
      }
      return { ...a, signedUrl: data.signedUrl };
    })
  );
}
