-- ============================================================
-- Support tickets -- created when a user escalates from the AI help
-- chat (src/app/api/help-chat/escalate). No admin dashboard exists yet
-- (see README) -- tickets are also emailed directly to SUPPORT_EMAIL
-- (see .env.example) so they're actionable without one; this table is
-- the durable record, readable via Supabase's table editor with the
-- service-role key in the meantime.
-- ============================================================
create table if not exists public.support_tickets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete set null,
  account_type text,
  subject text not null,
  conversation jsonb, -- full chat transcript at time of escalation, so the founder has context without asking the user to repeat themselves
  -- 'human_requested' -- Pro-tier owners can ask to speak with a person
  -- directly rather than file a ticket; same underlying table, flagged
  -- higher priority so it's easy to spot and handle first.
  priority text not null default 'normal' check (priority in ('normal', 'human_requested')),
  status text not null default 'open' check (status in ('open', 'in_progress', 'resolved')),
  created_at timestamptz default now()
);

alter table public.support_tickets enable row level security;

create policy "Users view their own tickets"
  on public.support_tickets for select
  using (auth.uid() = user_id);

create policy "Users create their own tickets"
  on public.support_tickets for insert
  with check (auth.uid() = user_id);

-- No update/delete policy for authenticated -- ticket status changes
-- are a support/admin action, done via service-role for now.
