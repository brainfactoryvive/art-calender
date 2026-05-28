-- Art Calendar: events table
-- Run in Supabase Dashboard → SQL Editor

create extension if not exists "pgcrypto";

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
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint events_end_after_start check (end_date > start_date)
);

create index if not exists events_start_date_idx on public.events (start_date);
create index if not exists events_end_date_idx on public.events (end_date);
create index if not exists events_is_global_idx on public.events (is_global);
create index if not exists events_user_id_idx on public.events (user_id);

create or replace function public.set_events_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists events_set_updated_at on public.events;
create trigger events_set_updated_at
  before update on public.events
  for each row
  execute function public.set_events_updated_at();

alter table public.events enable row level security;

-- Role-based policies: run supabase/migrations/002_auth_roles.sql after this file.

-- Realtime: enable in Database → Replication → supabase_realtime publication
alter publication supabase_realtime add table public.events;
