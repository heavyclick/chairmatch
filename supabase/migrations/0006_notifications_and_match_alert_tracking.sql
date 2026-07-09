-- ============================================================
-- In-app notifications -- backs the topbar bell, which currently has
-- no badge/count/dropdown because there was never a table behind it.
-- Written only by server-trusted code (service role) via
-- src/lib/notifications/create.ts -- a user can read/mark-read their
-- own rows but never insert directly, so a candidate/owner can't spoof
-- a notification to themselves or anyone else.
-- ============================================================
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade,
  type text not null, -- 'new_message' | 'interview_invite' | 'match_alert' | 'temp_job_alert' | 'saved_search_match'
  title text not null,
  body text,
  link text, -- relative path the notification should navigate to on click
  read_at timestamptz,
  created_at timestamptz default now()
);

create index if not exists notifications_user_unread_idx
  on public.notifications (user_id, created_at)
  where read_at is null;

alter table public.notifications enable row level security;

create policy "Users read their own notifications"
  on public.notifications for select
  using (auth.uid() = user_id);

create policy "Users mark their own notifications read"
  on public.notifications for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Deliberately NO insert policy for authenticated users -- notifications
-- are only ever created by server code using the service-role client
-- (see src/lib/notifications/create.ts), same trust boundary as billing
-- writes in 0004.

-- ============================================================
-- Match alert notification tracking -- match_alerts.notified_at (from
-- 0002) is a single timestamp on the alert itself, which only supports
-- "notified once, ever." An alert is meant to be a STANDING request --
-- notify me every time a new distinct candidate matches, not just the
-- first one. This join table tracks (alert, candidate) pairs already
-- notified, so the matching engine can skip candidates it already
-- flagged for a given alert while still catching new ones later.
-- ============================================================
create table if not exists public.match_alert_notifications (
  alert_id uuid references public.match_alerts(id) on delete cascade,
  candidate_id uuid references public.candidate_profiles(id) on delete cascade,
  notified_at timestamptz default now(),
  primary key (alert_id, candidate_id)
);

alter table public.match_alert_notifications enable row level security;

create policy "Owners view their own alert notification log"
  on public.match_alert_notifications for select
  using (
    exists (
      select 1 from public.match_alerts
      where match_alerts.id = match_alert_notifications.alert_id
      and match_alerts.owner_id = auth.uid()
    )
  );
-- No insert/update policy here either -- only the matching engine
-- (service role) writes to this table.
