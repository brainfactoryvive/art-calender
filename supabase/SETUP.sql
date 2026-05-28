-- =============================================================================
-- Art Calendar — Supabase 전체 스키마 (한 번에 실행)
-- Dashboard → SQL Editor → New query → 붙여넣기 → Run
-- =============================================================================

create extension if not exists "pgcrypto";

-- -----------------------------------------------------------------------------
-- 1. 역할 (Admin / Student)
-- -----------------------------------------------------------------------------
do $$ begin
  create type public.user_role as enum ('admin', 'student');
exception
  when duplicate_object then null;
end $$;

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  role public.user_role not null default 'student',
  display_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- 2. events — 입시·개인 일정
-- -----------------------------------------------------------------------------
create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null check (char_length(trim(title)) > 0),
  description text,
  start_date timestamptz not null,
  end_date timestamptz not null,
  color_code text not null default '#171717'
    check (color_code ~ '^#[0-9A-Fa-f]{6}$'),
  is_global boolean not null default false,
  is_major boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint events_end_after_start check (end_date > start_date)
);

create index if not exists events_start_date_idx on public.events (start_date);
create index if not exists events_end_date_idx on public.events (end_date);
create index if not exists events_is_global_idx on public.events (is_global);
create index if not exists events_user_id_idx on public.events (user_id);

-- -----------------------------------------------------------------------------
-- 3. routines — 학생당 3가지 매일 목표
-- -----------------------------------------------------------------------------
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

-- -----------------------------------------------------------------------------
-- 4. routine_logs — 날짜별 루틴 마킹(체크)
-- -----------------------------------------------------------------------------
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

-- -----------------------------------------------------------------------------
-- 5. 이메일 알림 (주간 요약 + D-1 리마인더)
-- -----------------------------------------------------------------------------
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

-- -----------------------------------------------------------------------------
-- Triggers: updated_at
-- -----------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists events_set_updated_at on public.events;
create trigger events_set_updated_at
  before update on public.events
  for each row execute function public.set_updated_at();

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

drop trigger if exists routines_set_updated_at on public.routines;
create trigger routines_set_updated_at
  before update on public.routines
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- Triggers: 신규 가입 시 profile + email_preferences
-- -----------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, role, display_name)
  values (
    new.id,
    'student',
    coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1))
  );
  insert into public.email_preferences (user_id) values (new.id)
  on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 기존 사용자 백필
insert into public.profiles (id, role, display_name)
select id, 'student', coalesce(raw_user_meta_data ->> 'display_name', split_part(email, '@', 1))
from auth.users
on conflict (id) do nothing;

insert into public.email_preferences (user_id)
select id from auth.users
on conflict (user_id) do nothing;

-- -----------------------------------------------------------------------------
-- Helper: 역할 확인
-- -----------------------------------------------------------------------------
create or replace function public.current_user_role()
returns public.user_role language sql stable security definer set search_path = public as $$
  select role from public.profiles where id = auth.uid();
$$;

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;

-- -----------------------------------------------------------------------------
-- RLS
-- -----------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.events enable row level security;
alter table public.routines enable row level security;
alter table public.routine_logs enable row level security;
alter table public.email_preferences enable row level security;
alter table public.email_notification_log enable row level security;

-- profiles
drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles for select to authenticated using (id = auth.uid());
drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own" on public.profiles for insert to authenticated with check (id = auth.uid());
drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

-- events: 전역 읽기 + 본인 개인만 / 타 학생 비공개
drop policy if exists "events_select_scoped" on public.events;
create policy "events_select_scoped" on public.events for select to authenticated
  using (is_global = true or user_id = auth.uid());

drop policy if exists "events_insert_admin_global" on public.events;
create policy "events_insert_admin_global" on public.events for insert to authenticated
  with check (public.is_admin() and is_global = true and user_id = auth.uid());

drop policy if exists "events_insert_student_personal" on public.events;
create policy "events_insert_student_personal" on public.events for insert to authenticated
  with check (public.current_user_role() = 'student' and is_global = false and user_id = auth.uid());

drop policy if exists "events_update_admin_global" on public.events;
create policy "events_update_admin_global" on public.events for update to authenticated
  using (public.is_admin() and is_global = true) with check (public.is_admin() and is_global = true);

drop policy if exists "events_delete_admin_global" on public.events;
create policy "events_delete_admin_global" on public.events for delete to authenticated
  using (public.is_admin() and is_global = true);

drop policy if exists "events_update_student_own" on public.events;
create policy "events_update_student_own" on public.events for update to authenticated
  using (public.current_user_role() = 'student' and is_global = false and user_id = auth.uid())
  with check (public.current_user_role() = 'student' and is_global = false and user_id = auth.uid());

drop policy if exists "events_delete_student_own" on public.events;
create policy "events_delete_student_own" on public.events for delete to authenticated
  using (public.current_user_role() = 'student' and is_global = false and user_id = auth.uid());

-- routines / routine_logs: 본인만
drop policy if exists "routines_all_own" on public.routines;
create policy "routines_all_own" on public.routines for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "routine_logs_all_own" on public.routine_logs;
create policy "routine_logs_all_own" on public.routine_logs for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- email
drop policy if exists "email_prefs_own" on public.email_preferences;
create policy "email_prefs_own" on public.email_preferences for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "email_log_select_own" on public.email_notification_log;
create policy "email_log_select_own" on public.email_notification_log for select to authenticated
  using (user_id = auth.uid());

-- -----------------------------------------------------------------------------
-- Realtime (Dashboard → Database → Replication 에서도 확인)
-- -----------------------------------------------------------------------------
do $$ begin
  alter publication supabase_realtime add table public.events;
exception when duplicate_object then null;
end $$;

do $$ begin
  alter publication supabase_realtime add table public.routine_logs;
exception when duplicate_object then null;
end $$;

-- -----------------------------------------------------------------------------
-- 관리자 지정 (본인 UUID로 교체 후 실행)
-- -----------------------------------------------------------------------------
-- update public.profiles set role = 'admin' where id = 'YOUR-USER-UUID';
