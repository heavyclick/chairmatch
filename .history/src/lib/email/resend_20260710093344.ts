/**
 * Server-only Resend email client.
 *
 * Before this file, there was no real Resend integration anywhere in
 * the codebase -- the `resend` npm package was never installed, and the
 * only text match for "resend" in the repo was the English word inside
 * a code comment. Every "you'll get an email for X" feature (new
 * message, interview invite, match alert, marketing) had nothing behind
 * it.
 *
 * Sends fail soft (logged, not thrown) when RESEND_API_KEY is unset --
 * so the app keeps working in local dev before you've added a key,
 * rather than every notification-triggering action crashing. Once a
 * key is set, sends are real.
 */
import { Resend } from "resend";

let client: Resend | null = null;
let warnedMissingKey = false;

function getClient(): Resend | null {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    if (!warnedMissingKey) {
      console.warn(
        "[email] RESEND_API_KEY is not set -- emails will be logged, not sent. Get a key at resend.com."
      );
      warnedMissingKey = true;
    }
    return null;
  }
  if (!client) client = new Resend(key);
  return client;
}

interface SendEmailArgs {
  to: string;
  subject: string;
  html: string;
  /** Defaults to EMAIL_FROM env var, falling back to a Resend sandbox address that only works in Resend's own testing mode. */
  from?: string;
}

export async function sendEmail({ to, subject, html, from }: SendEmailArgs) {
  const resend = getClient();
  const sender = from ?? process.env.EMAIL_FROM ?? "Hdenta <onboarding@resend.dev>";

  if (!resend) {
    console.log(`[email:not-sent, no API key] to=${to} subject="${subject}"`);
    return { skipped: true as const };
  }

  const { data, error } = await resend.emails.send({ from: sender, to, subject, html });
  if (error) {
    console.error("[email] Resend send failed:", error);
    return { skipped: false as const, error };
  }
  return { skipped: false as const, id: data?.id };
}
