-- Manual production operation: preserve learning data, then reset test users.
--
-- Intentionally not a migration: this is an operational cleanup script for the
-- live Supabase project before first TestFlight QA.
--
-- Safety model:
-- 1. Create a private, anonymized learning snapshot from current feedback rows.
-- 2. Verify row counts.
-- 3. Only then delete legacy test users from auth/public tables.
--
-- Run sections one by one. Do not run the DELETE section until the snapshot
-- count is acceptable.

begin;

create schema if not exists private;

create table if not exists private.learning_feedback_snapshot_20260525 (
  snapshot_id uuid primary key default gen_random_uuid(),
  source_feedback_hash text not null unique,
  anon_user_key text not null,
  source_bucket text not null,
  climate_zone text,
  bmi_bucket text,
  age_bucket text,
  gender text,
  feedback_date date not null,
  feedback_slot text,
  season text,
  feel_score integer,
  humid_feel integer,
  wind_feel integer,
  clothing integer,
  clothing_items text[],
  activity integer,
  sun_exposure integer,
  sleep integer,
  outdoor_hours integer,
  actual_temp numeric,
  actual_humidity integer,
  actual_wind numeric,
  actual_precip numeric,
  actual_tmrt_api numeric,
  tmrt_corrected numeric,
  clothing_offset numeric,
  activity_offset numeric,
  sleep_offset numeric,
  adjusted_feel numeric,
  personal_feel numeric,
  exposure_weight numeric,
  env_base numeric,
  created_at timestamptz not null default now()
);

insert into private.learning_feedback_snapshot_20260525 (
  source_feedback_hash,
  anon_user_key,
  source_bucket,
  climate_zone,
  bmi_bucket,
  age_bucket,
  gender,
  feedback_date,
  feedback_slot,
  season,
  feel_score,
  humid_feel,
  wind_feel,
  clothing,
  clothing_items,
  activity,
  sun_exposure,
  sleep,
  outdoor_hours,
  actual_temp,
  actual_humidity,
  actual_wind,
  actual_precip,
  actual_tmrt_api,
  tmrt_corrected,
  clothing_offset,
  activity_offset,
  sleep_offset,
  adjusted_feel,
  personal_feel,
  exposure_weight,
  env_base
)
select
  md5(f.id::text) as source_feedback_hash,
  md5(f.user_id::text || ':pws-learning-20260525') as anon_user_key,
  case
    when au.email like '%@test.pws' then 'legacy_test'
    else 'personal_or_real'
  end as source_bucket,
  u.climate_zone,
  u.bmi_bucket::text,
  u.age_bucket,
  u.gender::text,
  f.feedback_date,
  f.feedback_slot,
  case
    when extract(month from f.feedback_date) in (3, 4, 5) then 'spring'
    when extract(month from f.feedback_date) in (6, 7, 8) then 'summer'
    when extract(month from f.feedback_date) in (9, 10, 11) then 'autumn'
    else 'winter'
  end as season,
  f.feel_score,
  f.humid_feel,
  f.wind_feel,
  f.clothing,
  f.clothing_items,
  f.activity,
  f.sun_exposure,
  f.sleep,
  f.outdoor_hours,
  f.actual_temp,
  f.actual_humidity,
  f.actual_wind,
  f.actual_precip,
  f.actual_tmrt_api,
  f.tmrt_corrected,
  f.clothing_offset,
  f.activity_offset,
  f.sleep_offset,
  f.adjusted_feel,
  f.personal_feel,
  f.exposure_weight,
  f.env_base
from public.feedback_entries f
left join public.users u on u.id = f.user_id
left join auth.users au on au.id = f.user_id
where f.feedback_date is not null
  and f.feedback_slot is not null
  and f.feel_score is not null
on conflict (source_feedback_hash) do nothing;

commit;

-- Verification after snapshot.
select
  'private.learning_feedback_snapshot_20260525' as table_name,
  count(*) as rows,
  count(distinct anon_user_key) as anon_users,
  min(feedback_date) as first_feedback_date,
  max(feedback_date) as last_feedback_date
from private.learning_feedback_snapshot_20260525;

select
  source_bucket,
  count(*) as rows,
  count(distinct anon_user_key) as anon_users
from private.learning_feedback_snapshot_20260525
group by source_bucket
order by source_bucket;

-- Destructive cleanup section.
-- Run only after reviewing the verification result above.
--
-- begin;
--
-- with doomed_auth_users as (
--   select id
--   from auth.users
--   where email like '%@test.pws'
--     and email not like 'pws_tf_%@test.pws'
--     and email not like 'pws_delete_%@test.pws'
-- )
-- delete from public.feedback_entries
-- where user_id in (select id from doomed_auth_users);
--
-- with doomed_auth_users as (
--   select id
--   from auth.users
--   where email like '%@test.pws'
--     and email not like 'pws_tf_%@test.pws'
--     and email not like 'pws_delete_%@test.pws'
-- )
-- delete from public.tester_feedback
-- where user_id in (select id from doomed_auth_users);
--
-- with doomed_auth_users as (
--   select id
--   from auth.users
--   where email like '%@test.pws'
--     and email not like 'pws_tf_%@test.pws'
--     and email not like 'pws_delete_%@test.pws'
-- )
-- delete from public.users
-- where id in (select id from doomed_auth_users);
--
-- delete from auth.users
-- where email like '%@test.pws'
--   and email not like 'pws_tf_%@test.pws'
--   and email not like 'pws_delete_%@test.pws';
--
-- commit;
--
-- Post-cleanup verification:
-- select
--   (select count(*) from auth.users) as auth_users,
--   (select count(*) from public.users) as profile_users,
--   (select count(*) from public.feedback_entries) as feedback_entries,
--   (select count(*) from private.learning_feedback_snapshot_20260525) as preserved_learning_rows;
