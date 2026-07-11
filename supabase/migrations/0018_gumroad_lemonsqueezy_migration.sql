-- Hdenta migration 0018
-- Run AFTER 0017_support_ticket_attachments.sql.
--
-- Payment provider swap: Dodo Payments -> Gumroad (primary) /
-- Lemon Squeezy (fallback, once approved). Dodo Payments turned out to
-- be unable to verify accounts in Nigeria at all, so this isn't a
-- "temporary" swap the way Stripe -> Dodo was (see migration 0002) --
-- following that same rename-don't-duplicate pattern, but this time
-- landing on provider-agnostic column names instead of a new
-- provider-specific one, since we now expect to support switching
-- payment providers again in the future (see src/lib/payments/).

-- ============================================================
-- Rename Dodo-specific columns to provider-agnostic ones. A new
-- payment_provider column records which provider actually granted the
-- current entitlement ('gumroad' or 'lemonsqueezy'), since
-- payment_customer_id alone doesn't say which provider's ID it is.
-- ============================================================
alter table public.practice_profiles
  rename column dodo_customer_id to payment_customer_id;

alter table public.practice_profiles
  add column if not exists payment_provider text;

alter table public.screening_credit_purchases
  rename column dodo_payment_id to payment_id;

-- ============================================================
-- Re-close the paywall-bypass gap from migration 0004 under the new
-- column names. Postgres carries column-level privileges through a
-- rename automatically, so payment_customer_id is already covered --
-- this restates the full list explicitly (harmless if redundant) and
-- adds the new payment_provider column, which starts world-writable-
-- by-default on ALTER TABLE ADD COLUMN and would otherwise reopen
-- exactly the gap 0004 closed.
-- ============================================================
revoke update (
  subscription_tier,
  subscription_renews_at,
  payment_customer_id,
  payment_provider,
  screening_credit_balance
) on public.practice_profiles from authenticated;
