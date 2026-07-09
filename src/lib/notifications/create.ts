import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { sendEmail } from "@/lib/email/resend";

type NotificationType =
  | "new_message"
  | "interview_invite"
  | "match_alert"
  | "temp_job_alert"
  | "saved_search_match";

interface NotifyArgs {
  userId: string;
  type: NotificationType;
  title: string;
  body?: string;
  link?: string;
  /** If provided, also sends an email with this subject/html -- omit to make this in-app-only. */
  email?: { subject: string; html: string };
}

/**
 * Maps a notification type to its corresponding per-category email
 * preference column (migration 0009) -- "saved_search_match" has no
 * dedicated toggle since saved searches don't currently send emails at
 * all (new_match_count is computed on read, not pushed), so it falls
 * back to the messages toggle as the closest existing category rather
 * than silently having no preference check at all.
 */
const EMAIL_PREF_COLUMN: Record<NotificationType, string> = {
  new_message: "notification_email_messages",
  interview_invite: "notification_email_invites",
  match_alert: "notification_email_match_alerts",
  temp_job_alert: "notification_email_temp_jobs",
  saved_search_match: "notification_email_messages",
};

/**
 * Writes an in-app notification row and (optionally) sends the
 * corresponding email in one call, so callers don't have to
 * separately remember both. Must be called with the service-role
 * client (see src/lib/supabase/server.ts createServiceClient) --
 * there is no RLS insert policy for `notifications`, on purpose (see
 * migration 0006), so this will silently fail against a user-scoped
 * client.
 *
 * Respects the per-category email toggle for this notification's type
 * (migration 0009) -- if a user turned off email for this specific
 * category, the in-app notification still gets written (so the bell
 * still works), but the email is skipped. Categories default true, so
 * absence of an explicit false means "send."
 */
export async function notifyUser(
  supabase: SupabaseClient<Database>,
  { userId, type, title, body, link, email }: NotifyArgs
) {
  await supabase.from("notifications").insert({
    user_id: userId,
    type,
    title,
    body: body ?? null,
    link: link ?? null,
  });

  if (!email) return;

  const prefColumn = EMAIL_PREF_COLUMN[type];
  const { data: profile } = await supabase
    .from("profiles")
    .select(
      "email, notification_email_messages, notification_email_invites, notification_email_match_alerts, notification_email_temp_jobs"
    )
    .eq("id", userId)
    .single();

  if (!profile?.email) return;
  const prefValue = (profile as Record<string, unknown>)[prefColumn];
  if (prefValue === false) return;

  await sendEmail({ to: profile.email, subject: email.subject, html: email.html });
}
