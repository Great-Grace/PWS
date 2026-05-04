-- PWS Supabase Security Preflight / Verification Queries
-- Run before and after pws_security_baseline.sql.

-- 1) RLS status must all be true.
select schemaname, tablename, rowsecurity
from pg_tables
where schemaname = 'public'
  and tablename in ('users', 'feedback_entries', 'weather_cache', 'tester_feedback')
order by tablename;

-- 2) Duplicate checks: these must return zero rows before creating unique indexes.
select user_id, feedback_date, feedback_slot, count(*)
from public.feedback_entries
group by user_id, feedback_date, feedback_slot
having count(*) > 1;

select lat, lng, count(*)
from public.weather_cache
group by lat, lng
having count(*) > 1;

-- 3) Policies overview.
select schemaname, tablename, policyname, cmd, roles, qual, with_check
from pg_policies
where schemaname = 'public'
  and tablename in ('users', 'feedback_entries', 'weather_cache', 'tester_feedback')
order by tablename, policyname;

-- 4) Function privilege check.
select n.nspname as schema,
       p.proname as function,
       p.prosecdef as security_definer,
       p.proconfig as config
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname = 'delete_own_account';

-- 5) Public client grants should stay narrow.
select table_schema, table_name, privilege_type, grantee
from information_schema.table_privileges
where table_schema = 'public'
  and grantee in ('anon', 'authenticated')
order by table_name, grantee, privilege_type;

-- 6) Exposed views should be security invoker.
select c.relname as view_name,
       c.reloptions
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relkind = 'v'
order by c.relname;

-- 7) SECURITY DEFINER functions should not live in the public schema.
select n.nspname as schema,
       p.proname as function,
       p.prosecdef as security_definer,
       p.proconfig as config
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname in ('public', 'private')
  and p.prosecdef
order by schema, function;
