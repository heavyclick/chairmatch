-- ============================================================
-- Per-thread read tracking -- previously message_threads had no way
-- to tell "has the owner/candidate seen the latest message in this
-- thread yet," so the messages list couldn't show unread indicators,
-- previews, or a sidebar badge count. Each side of a thread has its
-- own last-read timestamp (a message from the candidate doesn't mark
-- the thread read for the owner, and vice versa).
-- ============================================================
alter table public.message_threads
  add column if not exists owner_last_read_at timestamptz,
  add column if not exists candidate_last_read_at timestamptz;

-- Owners/candidates can update only their OWN side's read timestamp on
-- a thread they're actually part of -- reuses the same participant
-- check as the existing SELECT policy, just scoped to UPDATE and only
-- the two read-timestamp columns (enforced by the app layer selecting
-- only those columns in its update call; Postgres RLS itself is
-- row-level here, matching the existing pattern on this table).
create policy "Participants mark their own thread read"
  on public.message_threads for update
  using (auth.uid() = owner_id or auth.uid() = candidate_id)
  with check (auth.uid() = owner_id or auth.uid() = candidate_id);
