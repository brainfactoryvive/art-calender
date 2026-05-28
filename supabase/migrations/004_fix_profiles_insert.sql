-- OAuth 가입 후 profile 자동 생성이 안 될 때: insert 정책 추가
drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own"
  on public.profiles
  for insert
  to authenticated
  with check (id = auth.uid());
