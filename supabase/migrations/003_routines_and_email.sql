-- Routines, habit logs, and email notification scaffolding

-- Major global events trigger 24h reminder emails
alter table public.events
  add column if not exists is_major boolean not null default false;

-- ---------------------------------------------------------------------------
-- Daily routines (3 slots per student)
-- ---------------------------------------------------------------------------
create table if not exists public.routines (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  slot smallint not null check (slot between 1 and 3),
  emoji text not null check (char_length(emoji) > 0),
  title text not null check (char_length(trim(title)) > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, slot)
);

create index if not exists routines_user_id_idx on public.routines (user_id);

create or replace function public.set_routines_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists routines_set_updated_at on public.routines;
create trigger routines_set_updated_at
  before update on public.routines
  for each row
  execute function public.set_routines_updated_at();

-- ---------------------------------------------------------------------------
-- Per-day completion logs
-- ---------------------------------------------------------------------------
create table if not exists public.routine_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  routine_id uuid not null references public.routines (id) on delete cascade,
  log_date date not null,
  completed boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, routine_id, log_date)
);

create index if not exists routine_logs_user_date_idx
  on public.routine_logs (user_id, log_date);

create index if not exists routine_logs_routine_id_idx
  on public.routine_logs (routine_id);

-- ---------------------------------------------------------------------------
-- Email preferences & delivery log
-- ---------------------------------------------------------------------------
create table if not exists public.email_preferences (
  user_id uuid primary key references auth.users (id) on delete cascade,
  weekly_digest_enabled boolean not null default true,
  event_reminder_enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.email_notification_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  notification_type text not null check (
    notification_type in ('weekly_digest', 'event_reminder')
  ),
  event_id uuid references public.events (id) on delete set null,
  recipient_email text not null,
  subject text not null,
  status text not null default 'pending' check (
    status in ('pending', 'sent', 'failed')
  ),
  error_message text,
  scheduled_for timestamptz not null,
  sent_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists email_notification_log_scheduled_idx
  on public.email_notification_log (status, scheduled_for);

-- Auto-create email prefs for new users
create or replace function public.handle_new_user_email_prefs()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.email_preferences (user_id)
  values (new.id)
  on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_email_prefs on auth.users;
create trigger on_auth_user_email_prefs
  after insert on auth.users
  for each row
  execute function public.handle_new_user_email_prefs();

-- RLS
alter table public.routines enable row level security;
alter table public.routine_logs enable row level security;
alter table public.email_preferences enable row level security;
alter table public.email_notification_log enable row level security;

-- routines: own rows only
drop policy if exists "routines_select_own" on public.routines;
create policy "routines_select_own"
  on public.routines for select to authenticated
  using (user_id = auth.uid());

drop policy if exists "routines_insert_own" on public.routines;
create policy "routines_insert_own"
  on public.routines for insert to authenticated
  with check (user_id = auth.uid());

drop policy if exists "routines_update_own" on public.routines;
create policy "routines_update_own"
  on public.routines for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "routines_delete_own" on public.routines;
create policy "routines_delete_own"
  on public.routines for delete to authenticated
  using (user_id = auth.uid());

-- routine_logs: own rows only
drop policy if exists "routine_logs_select_own" on public.routine_logs;
create policy "routine_logs_select_own"
  on public.routine_logs for select to authenticated
  using (user_id = auth.uid());

drop policy if exists "routine_logs_insert_own" on public.routine_logs;
create policy "routine_logs_insert_own"
  on public.routine_logs for insert to authenticated
  with check (user_id = auth.uid());

drop policy if exists "routine_logs_update_own" on public.routine_logs;
create policy "routine_logs_update_own"
  on public.routine_logs for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "routine_logs_delete_own" on public.routine_logs;
create policy "routine_logs_delete_own"
  on public.routine_logs for delete to authenticated
  using (user_id = auth.uid());

-- email_preferences: own row
drop policy if exists "email_prefs_select_own" on public.email_preferences;
create policy "email_prefs_select_own"
  on public.email_preferences for select to authenticated
  using (user_id = auth.uid());

drop policy if exists "email_prefs_update_own" on public.email_preferences;
create policy "email_prefs_update_own"
  on public.email_preferences for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- notification log: users can read own delivery history
drop policy if exists "email_log_select_own" on public.email_notification_log;
create policy "email_log_select_own"
  on public.email_notification_log for select to authenticated
  using (user_id = auth.uid());

-- Realtime for habit sync
alter publication supabase_realtime add table public.routine_logs;
