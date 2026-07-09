-- ============================================================
-- Share/invite popup cadence tracking. Per the agreed design: shown
-- once after a few clicks into the app post-signup; if dismissed
-- (not shared, not "don't show again"), re-shown every 1-2 weeks up to
-- a few times; then goes quiet and resurfaces roughly every 2-3 months
-- indefinitely until the user shares or explicitly dismisses forever.
--
-- Tracked server-side on `profiles` (shared by both account types)
-- rather than client-side localStorage, so the cadence is consistent
-- across devices/browsers and isn't lost when browser storage is
-- cleared -- this is a real growth feature the business cares about,
-- worth the small amount of server state.
-- ============================================================
alter table public.profiles
  add column if not exists share_popup_nav_count integer default 0,
  add column if not exists share_popup_shown_count integer default 0,
  add column if not exists share_popup_last_shown_at timestamptz,
  add column if not exists share_popup_dismissed_forever boolean default false;
