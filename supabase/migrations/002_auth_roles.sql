-- Roles: admin (원장/강사), student (학생)
-- Run after 001 / schema.sql in Supabase SQL Editor

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

create or replace function public.set_profiles_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
  before update on public.profiles
  for each row
  execute function public.set_profiles_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, role, display_name)
  values (
    new.id,
    'student',
    coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1))
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();

create or replace function public.current_user_role()
returns public.user_role
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid();
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles where id = auth.uid() and role = 'admin'
  );
$$;

alter table public.profiles enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
  on public.profiles
  for select
  to authenticated
  using (id = auth.uid());

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own"
  on public.profiles
  for insert
  to authenticated
  with check (id = auth.uid());

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
  on public.profiles
  for update
  to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- Replace permissive events policies
drop policy if exists "events_select_public" on public.events;
drop policy if exists "events_insert_own" on public.events;
drop policy if exists "events_update_own" on public.events;
drop policy if exists "events_delete_own" on public.events;

-- Read: global admission schedule OR own personal events only
drop policy if exists "events_select_scoped" on public.events;
create policy "events_select_scoped"
  on public.events
  for select
  to authenticated
  using (is_global = true or user_id = auth.uid());

-- Admin: create global events
drop policy if exists "events_insert_admin_global" on public.events;
create policy "events_insert_admin_global"
  on public.events
  for insert
  to authenticated
  with check (
    public.is_admin()
    and is_global = true
    and user_id = auth.uid()
  );

-- Student: create personal events only
drop policy if exists "events_insert_student_personal" on public.events;
create policy "events_insert_student_personal"
  on public.events
  for insert
  to authenticated
  with check (
    public.current_user_role() = 'student'
    and is_global = false
    and user_id = auth.uid()
  );

-- Admin: update/delete any global event
drop policy if exists "events_update_admin_global" on public.events;
create policy "events_update_admin_global"
  on public.events
  for update
  to authenticated
  using (public.is_admin() and is_global = true)
  with check (public.is_admin() and is_global = true);

drop policy if exists "events_delete_admin_global" on public.events;
create policy "events_delete_admin_global"
  on public.events
  for delete
  to authenticated
  using (public.is_admin() and is_global = true);

-- Student: update/delete own personal events only
drop policy if exists "events_update_student_own" on public.events;
create policy "events_update_student_own"
  on public.events
  for update
  to authenticated
  using (public.current_user_role() = 'student' and is_global = false and user_id = auth.uid())
  with check (
    public.current_user_role() = 'student'
    and is_global = false
    and user_id = auth.uid()
  );

drop policy if exists "events_delete_student_own" on public.events;
create policy "events_delete_student_own"
  on public.events
  for delete
  to authenticated
  using (
    public.current_user_role() = 'student'
    and is_global = false
    and user_id = auth.uid()
  );

-- Backfill profiles for users created before this migration
insert into public.profiles (id, role, display_name)
select
  id,
  'student',
  coalesce(raw_user_meta_data ->> 'display_name', split_part(email, '@', 1))
from auth.users
on conflict (id) do nothing;

-- Promote your admin account manually, e.g.:
-- update public.profiles set role = 'admin' where id = 'YOUR-USER-UUID';
