-- ============================================================
-- Close a paywall-bypass gap: practice_profiles RLS policy
-- ("Owners manage own practice profile", for all, using auth.uid() = id)
-- grants full read/write on the whole row, including billing columns.
-- That means any logged-in owner can currently set their own
-- subscription_tier / screening_credit_balance / dodo_customer_id
-- directly from the browser (e.g. via the Supabase client in devtools),
-- bypassing Dodo entirely. RLS alone can't restrict by column -- that's
-- what Postgres column-level GRANT/REVOKE is for, layered on top of RLS.
--
-- The `authenticated` role is what Supabase's client-side SDK runs as.
-- The `service_role` key (used in createServiceClient(), only ever on
-- the server -- the real webhook and the dev-only unlock fallback) is
-- not restricted by this and keeps full write access, since billing
-- writes should only ever happen there.
-- ============================================================
revoke update (
  subscription_tier,
  subscription_renews_at,
  dodo_customer_id,
  screening_credit_balance
) on public.practice_profiles from authenticated;
