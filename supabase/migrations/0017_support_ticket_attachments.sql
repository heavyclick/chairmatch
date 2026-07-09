-- ============================================================
-- Support ticket attachments -- for the new direct "file a ticket"
-- button (separate from the AI chat escalation flow). Stored as a
-- jsonb array of {url, name, size} on the ticket row itself, rather
-- than a separate join table -- a handful of files per ticket, never
-- queried independently of their parent ticket, so a join table would
-- be unnecessary overhead.
--
-- Private bucket, unlike practice-gallery (public) -- ticket
-- attachments could reasonably contain screenshots with account/
-- billing details, so access is restricted to the ticket's own
-- creator (via their own authenticated session) rather than public.
-- The founder views attachments via a signed URL generated
-- specifically for the notification email (src/lib/support-tickets/
-- attachments.ts), not the bucket being public.
-- ============================================================
alter table public.support_tickets
  add column if not exists attachments jsonb default '[]'::jsonb;

insert into storage.buckets (id, name, public)
values ('support-attachments', 'support-attachments', false)
on conflict (id) do nothing;

create policy "Users upload their own ticket attachments"
  on storage.objects for insert
  with check (
    bucket_id = 'support-attachments'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Users view their own ticket attachments"
  on storage.objects for select
  using (
    bucket_id = 'support-attachments'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
