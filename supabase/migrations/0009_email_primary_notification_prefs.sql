-- ============================================================
-- Email becomes the primary notification channel (per founder
-- decision -- no phone numbers are ever collected anywhere in the
-- product, so the SMS toggles in candidate settings controlled
-- nothing real). Adds granular per-category toggles mirroring what the
-- SMS toggles tried to offer (messages / invites / temp jobs
-- separately) plus match alerts, matching the real NotificationType
-- union in src/lib/notifications/create.ts exactly -- so each
-- category's toggle actually controls that category's email, not one
-- blanket on/off switch.
--
-- notification_email_digest (from migration 0001) is left in place
-- but no longer read by the settings UI or notifyUser() -- nothing in
-- the codebase ever sent an actual digest email, so it was dead too;
-- not dropped here to avoid unnecessary migration risk on a column
-- that's simply unused going forward.
-- ============================================================
alter table public.profiles
  add column if not exists notification_email_messages boolean default true,
  add column if not exists notification_email_invites boolean default true,
  add column if not exists notification_email_match_alerts boolean default true,
  add column if not exists notification_email_temp_jobs boolean default true;
