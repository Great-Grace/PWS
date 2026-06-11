-- Fix delete_own_account RPC search_path hardening and public-schema exposure.
-- Run in Supabase SQL Editor.

begin;

create schema if not exists private;
alter schema private owner to postgres;

revoke all on schema private from public;
revoke all on schema private from anon;
revoke all on schema private from authenticated;

create or replace function private.delete_own_account()
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

create or replace function public.delete_own_account()
returns void
language sql
security invoker
set search_path = ''
as $$
  select private.delete_own_account();
$$;

revoke all on function public.delete_own_account() from public;
revoke all on function public.delete_own_account() from anon;
revoke all on function public.delete_own_account() from authenticated;
revoke all on function private.delete_own_account() from public;
revoke all on function private.delete_own_account() from anon;
revoke all on function private.delete_own_account() from authenticated;

grant usage on schema private to authenticated;
grant execute on function private.delete_own_account() to authenticated;
grant execute on function public.delete_own_account() to authenticated;

commit;

-- Verify. Expected:
-- public.delete_own_account: security_definer = false
-- private.delete_own_account: security_definer = true
-- config should include search_path="" or equivalent empty search_path for both.
select n.nspname as schema,
       p.proname as function,
       p.prosecdef as security_definer,
       p.proconfig as config
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname in ('public', 'private')
  and p.proname = 'delete_own_account';
