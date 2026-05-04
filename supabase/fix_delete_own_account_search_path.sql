-- Fix delete_own_account SECURITY DEFINER search_path hardening
-- Run in Supabase SQL Editor.

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

-- Verify. Expected:
-- security_definer = true
-- config should include search_path="" or equivalent empty search_path.
select n.nspname as schema,
       p.proname as function,
       p.prosecdef as security_definer,
       p.proconfig as config
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname = 'delete_own_account';
