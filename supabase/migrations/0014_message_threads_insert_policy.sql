-- ============================================================
-- Root cause of "Message" doing nothing anywhere in the app: RLS is
-- enabled on message_threads (migration 0001) with a SELECT policy,
-- but no INSERT policy was ever added. RLS defaults to deny for any
-- operation with no matching policy -- so every attempt to start a
-- brand-new conversation (which requires inserting a thread row) was
-- silently rejected, every time, for every user, since the feature
-- was first built.
--
-- Only an owner can originate a new thread (matches
-- /api/messages/route.ts's own existing logic/comment: "candidates
-- reply into existing threads, they don't originate new ones from
-- this endpoint") -- so the check is auth.uid() = owner_id, not a
-- symmetric check for candidate_id too.
-- ============================================================
create policy "Owners start new message threads"
  on public.message_threads for insert
  with check (auth.uid() = owner_id);
