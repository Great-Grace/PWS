-- PWS Supabase Security Baseline
-- Target: PWS Expo/RN tester + Android V1.0 preparation
-- How to run: Supabase Dashboard > SQL Editor > paste this whole file > Run.
-- If this is an already-busy production DB, read docs/security/PWS_SUPABASE_SECURITY_FINAL_GUIDE.md first for lock notes.

begin;

-- -----------------------------------------------------------------------------
-- 0) Required API grants: authenticated app users only.
--    RLS below still decides which rows each user can see or modify.
-- -----------------------------------------------------------------------------
revoke all on table public.users from anon;
revoke all on table public.feedback_entries from anon;
revoke all on table public.weather_cache from anon;
revoke all on table public.tester_feedback from anon;

revoke all on table public.users from authenticated;
revoke all on table public.feedback_entries from authenticated;
revoke all on table public.weather_cache from authenticated;
revoke all on table public.tester_feedback from authenticated;

grant select, insert, update, delete on table public.users to authenticated;
grant select, insert, update, delete on table public.feedback_entries to authenticated;
grant select, insert, update on table public.weather_cache to authenticated;
grant select, insert on table public.tester_feedback to authenticated;

-- -----------------------------------------------------------------------------
-- 1) RLS must be enabled on all client-reachable public tables.
-- -----------------------------------------------------------------------------
alter table public.users enable row level security;
alter table public.feedback_entries enable row level security;
alter table public.weather_cache enable row level security;
alter table public.tester_feedback enable row level security;

-- -----------------------------------------------------------------------------
-- 2) users: users may only access their own profile row.
-- -----------------------------------------------------------------------------
drop policy if exists "users_select_own" on public.users;
drop policy if exists "users_insert_own" on public.users;
drop policy if exists "users_update_own" on public.users;
drop policy if exists "users_delete_own" on public.users;

create policy "users_select_own"
on public.users
for select
to authenticated
using (id = (select auth.uid()));

create policy "users_insert_own"
on public.users
for insert
to authenticated
with check (id = (select auth.uid()));

create policy "users_update_own"
on public.users
for update
to authenticated
using (id = (select auth.uid()))
with check (id = (select auth.uid()));

create policy "users_delete_own"
on public.users
for delete
to authenticated
using (id = (select auth.uid()));

-- -----------------------------------------------------------------------------
-- 3) feedback_entries: users may only access their own weather/feel records.
-- -----------------------------------------------------------------------------
drop policy if exists "feedback_select_own" on public.feedback_entries;
drop policy if exists "feedback_insert_own" on public.feedback_entries;
drop policy if exists "feedback_update_own" on public.feedback_entries;
drop policy if exists "feedback_delete_own" on public.feedback_entries;

create policy "feedback_select_own"
on public.feedback_entries
for select
to authenticated
using (user_id = (select auth.uid()));

create policy "feedback_insert_own"
on public.feedback_entries
for insert
to authenticated
with check (user_id = (select auth.uid()));

create policy "feedback_update_own"
on public.feedback_entries
for update
to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

create policy "feedback_delete_own"
on public.feedback_entries
for delete
to authenticated
using (user_id = (select auth.uid()));

-- App assumes one feedback row per user/date/slot.
-- If this fails, run the duplicate preflight query in the guide and clean duplicates first.
create unique index if not exists feedback_entries_user_date_slot_uidx
on public.feedback_entries (user_id, feedback_date, feedback_slot);

create index if not exists feedback_entries_user_date_idx
on public.feedback_entries (user_id, feedback_date desc);

-- -----------------------------------------------------------------------------
-- 4) weather_cache: shared non-personal weather cache.
--    Current client writes cache directly, so authenticated insert/update is allowed.
--    Production-scale hardening recommendation: move writes to Edge Function/backend.
-- -----------------------------------------------------------------------------
drop policy if exists "weather_cache_select_authenticated" on public.weather_cache;
drop policy if exists "weather_cache_insert_authenticated" on public.weather_cache;
drop policy if exists "weather_cache_update_authenticated" on public.weather_cache;

create policy "weather_cache_select_authenticated"
on public.weather_cache
for select
to authenticated
using (true);

create policy "weather_cache_insert_authenticated"
on public.weather_cache
for insert
to authenticated
with check (
  lat between -90 and 90
  and lng between -180 and 180
  and expires_at > fetched_at
  and expires_at <= fetched_at + interval '2 hours'
);

create policy "weather_cache_update_authenticated"
on public.weather_cache
for update
to authenticated
using (true)
with check (
  lat between -90 and 90
  and lng between -180 and 180
  and expires_at > fetched_at
  and expires_at <= fetched_at + interval '2 hours'
);

-- Required because app uses upsert(..., { onConflict: 'lat,lng' }).
-- If this fails, run the duplicate preflight query in the guide and clean duplicates first.
create unique index if not exists weather_cache_lat_lng_uidx
on public.weather_cache (lat, lng);

create index if not exists weather_cache_lookup_idx
on public.weather_cache (lat, lng, expires_at desc, fetched_at desc);

-- -----------------------------------------------------------------------------
-- 5) tester_feedback: app can write support feedback; users can only read own rows.
--    Admin review should happen from Supabase dashboard/service role, not client.
-- -----------------------------------------------------------------------------
drop policy if exists "tester_feedback_insert_own" on public.tester_feedback;
drop policy if exists "tester_feedback_select_own" on public.tester_feedback;

create policy "tester_feedback_insert_own"
on public.tester_feedback
for insert
to authenticated
with check (user_id = (select auth.uid()));

create policy "tester_feedback_select_own"
on public.tester_feedback
for select
to authenticated
using (user_id = (select auth.uid()));

create index if not exists tester_feedback_user_created_idx
on public.tester_feedback (user_id, created_at desc);

-- -----------------------------------------------------------------------------
-- 6) Account deletion RPC.
--    Critical rules:
--    - no user_id argument
--    - only auth.uid()
--    - SECURITY DEFINER with empty search_path and schema-qualified tables
--    - only authenticated can execute
-- -----------------------------------------------------------------------------
create or replace function public.delete_own_account()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
begin
  if current_user_id is null then
    raise exception 'not authenticated';
  end if;

  delete from public.feedback_entries
  where user_id = current_user_id;

  delete from public.tester_feedback
  where user_id = current_user_id;

  delete from public.users
  where id = current_user_id;

  delete from auth.users
  where id = current_user_id;
end;
$$;

revoke all on function public.delete_own_account() from public;
revoke all on function public.delete_own_account() from anon;
revoke all on function public.delete_own_account() from authenticated;
grant execute on function public.delete_own_account() to authenticated;

commit;
