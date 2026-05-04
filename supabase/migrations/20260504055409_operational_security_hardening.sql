-- PWS operational security hardening
-- Deploy weather-onecall and set OPENWEATHER_API_KEY before applying the
-- weather_cache write lockdown to a live app fleet.

begin;

create schema if not exists private;
create schema if not exists extensions;

alter schema private owner to postgres;
alter schema extensions owner to postgres;

revoke all on schema private from public;
revoke all on schema private from anon;
revoke all on schema private from authenticated;

do $$
begin
  if exists (
    select 1
    from pg_extension e
    join pg_namespace n on n.oid = e.extnamespace
    where e.extname = 'pg_trgm'
      and n.nspname = 'public'
  ) then
    alter extension pg_trgm set schema extensions;
  end if;
end;
$$;

alter view if exists public.v_group_offsets set (security_invoker = true);
alter view if exists public.v_today_prediction set (security_invoker = true);

revoke all privileges on all tables in schema public from anon;
revoke all privileges on all tables in schema public from authenticated;

grant select, insert, update, delete on table public.users to authenticated;
grant select, insert, update, delete on table public.feedback_entries to authenticated;
grant select, insert on table public.tester_feedback to authenticated;
grant select on table public.weather_cache to authenticated;

alter table public.users enable row level security;
alter table public.feedback_entries enable row level security;
alter table public.tester_feedback enable row level security;
alter table public.weather_cache enable row level security;
alter table public.predictions enable row level security;
alter table public.notification_log enable row level security;
alter table public.anon_feedback_pool enable row level security;
alter table public.user_anon_map enable row level security;

drop policy if exists "users_select_own" on public.users;
drop policy if exists "users_insert_own" on public.users;
drop policy if exists "users_update_own" on public.users;
drop policy if exists "users_delete_own" on public.users;

create policy "users_select_own"
on public.users for select to authenticated
using (id = (select auth.uid()));

create policy "users_insert_own"
on public.users for insert to authenticated
with check (id = (select auth.uid()));

create policy "users_update_own"
on public.users for update to authenticated
using (id = (select auth.uid()))
with check (id = (select auth.uid()));

create policy "users_delete_own"
on public.users for delete to authenticated
using (id = (select auth.uid()));

drop policy if exists "feedback_select_own" on public.feedback_entries;
drop policy if exists "feedback_insert_own" on public.feedback_entries;
drop policy if exists "feedback_update_own" on public.feedback_entries;
drop policy if exists "feedback_delete_own" on public.feedback_entries;

create policy "feedback_select_own"
on public.feedback_entries for select to authenticated
using (user_id = (select auth.uid()));

create policy "feedback_insert_own"
on public.feedback_entries for insert to authenticated
with check (user_id = (select auth.uid()));

create policy "feedback_update_own"
on public.feedback_entries for update to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

create policy "feedback_delete_own"
on public.feedback_entries for delete to authenticated
using (user_id = (select auth.uid()));

drop policy if exists "admin read" on public.tester_feedback;
drop policy if exists "insert own" on public.tester_feedback;
drop policy if exists "tester can insert own feedback" on public.tester_feedback;
drop policy if exists "tester can read own feedback" on public.tester_feedback;
drop policy if exists "tester_feedback_insert_own" on public.tester_feedback;
drop policy if exists "tester_feedback_select_own" on public.tester_feedback;

create policy "tester_feedback_insert_own"
on public.tester_feedback for insert to authenticated
with check (user_id = (select auth.uid()));

create policy "tester_feedback_select_own"
on public.tester_feedback for select to authenticated
using (user_id = (select auth.uid()));

drop policy if exists "weather_cache_read_all" on public.weather_cache;
drop policy if exists "weather_cache_select_authenticated" on public.weather_cache;
drop policy if exists "weather_cache_insert_authenticated" on public.weather_cache;
drop policy if exists "weather_cache_update_authenticated" on public.weather_cache;
drop policy if exists "로그인한 모든 유저는 날씨 캐시를 자유롭게 이" on public.weather_cache;

create policy "weather_cache_select_authenticated"
on public.weather_cache for select to authenticated
using (true);

drop policy if exists "predictions_select_own" on public.predictions;
create policy "predictions_select_own"
on public.predictions for select to authenticated
using (user_id = (select auth.uid()));

drop policy if exists "notif_select_own" on public.notification_log;
create policy "notif_select_own"
on public.notification_log for select to authenticated
using (user_id = (select auth.uid()));

drop policy if exists "anon_feedback_pool_deny_client_access" on public.anon_feedback_pool;
create policy "anon_feedback_pool_deny_client_access"
on public.anon_feedback_pool for all to anon, authenticated
using (false)
with check (false);

drop policy if exists "user_anon_map_deny_client_access" on public.user_anon_map;
create policy "user_anon_map_deny_client_access"
on public.user_anon_map for all to anon, authenticated
using (false)
with check (false);

create index if not exists weather_cache_lookup_idx
on public.weather_cache (lat, lng, expires_at desc, fetched_at desc);

create index if not exists tester_feedback_user_created_idx
on public.tester_feedback (user_id, created_at desc);

drop index if exists public.feedback_entries_user_date_slot_uidx;
drop index if exists public.idx_tester_feedback_user_date;
drop index if exists public.weather_cache_lat_lng_uidx;

create or replace function private.adjust_user_wardrobe_item(
  p_user_id uuid,
  p_item text,
  p_delta integer
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.users
     set wardrobe = case
       when coalesce((wardrobe ->> p_item)::integer, 0) + p_delta <= 0
         then wardrobe - p_item
       else jsonb_set(
              wardrobe,
              array[p_item],
              to_jsonb(coalesce((wardrobe ->> p_item)::integer, 0) + p_delta),
              true
            )
     end
   where id = p_user_id;
end;
$$;

create or replace function private.update_user_wardrobe()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  item text;
begin
  if tg_op in ('UPDATE', 'DELETE')
     and old.clothing_items is not null
     and array_length(old.clothing_items, 1) > 0 then
    foreach item in array old.clothing_items loop
      perform private.adjust_user_wardrobe_item(old.user_id, item, -1);
    end loop;
  end if;

  if tg_op in ('INSERT', 'UPDATE')
     and new.clothing_items is not null
     and array_length(new.clothing_items, 1) > 0 then
    foreach item in array new.clothing_items loop
      perform private.adjust_user_wardrobe_item(new.user_id, item, 1);
    end loop;
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;

  return new;
end;
$$;

create or replace function private.anonymize_and_pool()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user record;
begin
  select climate_zone, bmi_bucket, age_bucket, gender
    into v_user
    from public.users
   where id = new.user_id;

  insert into public.anon_feedback_pool (
    id,
    climate_zone, bmi_bucket, age_bucket, gender,
    feedback_date, season, feedback_slot,
    feel_score, humid_feel, wind_feel,
    clothing, activity, sun_exposure, sleep, outdoor_hours,
    actual_temp, actual_humidity, actual_wind, tmrt_corrected,
    weighted_feel, env_base, personal_offset
  ) values (
    gen_random_uuid(),
    coalesce(v_user.climate_zone, 'unknown'),
    coalesce(v_user.bmi_bucket, 'unknown'),
    coalesce(v_user.age_bucket, 'unknown'),
    coalesce(v_user.gender, 'unknown'),
    new.feedback_date,
    public.get_season(new.feedback_date),
    new.feedback_slot,
    new.feel_score,
    new.humid_feel, new.wind_feel,
    new.clothing, new.activity,
    new.sun_exposure, new.sleep, new.outdoor_hours,
    new.actual_temp, new.actual_humidity, new.actual_wind, new.tmrt_corrected,
    new.weighted_feel, new.env_base,
    case
      when new.weighted_feel is not null and new.env_base is not null
        then new.weighted_feel - new.env_base
      else null
    end
  );

  return new;
end;
$$;

create or replace function private.run_prediction_batch()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user record;
  v_pred record;
  v_weather record;
  v_env numeric;
  v_season text;
begin
  for v_user in
    select distinct u.id as user_id,
           u.default_lat, u.default_lng, u.climate_zone
    from public.users u
    where u.is_active = true
      and not exists (
        select 1 from public.predictions p
        where p.user_id = u.id
          and p.prediction_date = current_date + 1
      )
  loop
    select temp_c, humidity_pct, wind_mps, tmrt_api
    into v_weather
    from public.weather_cache
    where lat = round(v_user.default_lat::numeric, 2)
      and lng = round(v_user.default_lng::numeric, 2)
      and expires_at > now()
    order by fetched_at desc
    limit 1;

    v_season := public.get_season(current_date + 1);

    if v_weather.temp_c is not null then
      v_env := public.compute_env_base(
        v_weather.temp_c,
        v_weather.humidity_pct,
        0,
        coalesce(v_weather.tmrt_api, 0),
        v_season
      );
    else
      v_env := 2.5;
    end if;

    select * into v_pred
    from public.predict_feel(v_user.user_id, current_date + 1, v_env);

    insert into public.predictions (
      user_id, prediction_date,
      predicted_feel, confidence, feedback_count,
      personal_offset, group_offset, blend_weight, final_offset,
      forecast_temp, forecast_humidity, forecast_wind, forecast_tmrt,
      env_base_forecast
    ) values (
      v_user.user_id, current_date + 1,
      v_pred.predicted_feel, v_pred.confidence, v_pred.feedback_count,
      v_pred.personal_offset, v_pred.group_offset, v_pred.blend_weight, v_pred.final_offset,
      v_weather.temp_c, v_weather.humidity_pct, v_weather.wind_mps, v_weather.tmrt_api,
      v_env
    )
    on conflict (user_id, prediction_date) do update set
      predicted_feel = excluded.predicted_feel,
      confidence = excluded.confidence,
      feedback_count = excluded.feedback_count,
      personal_offset = excluded.personal_offset,
      group_offset = excluded.group_offset,
      blend_weight = excluded.blend_weight,
      final_offset = excluded.final_offset,
      forecast_temp = excluded.forecast_temp,
      forecast_humidity = excluded.forecast_humidity,
      forecast_wind = excluded.forecast_wind,
      forecast_tmrt = excluded.forecast_tmrt,
      env_base_forecast = excluded.env_base_forecast;
  end loop;
end;
$$;

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

drop trigger if exists feedback_anonymize on public.feedback_entries;
create trigger feedback_anonymize
after insert on public.feedback_entries
for each row
execute function private.anonymize_and_pool();

drop trigger if exists trg_update_wardrobe on public.feedback_entries;
create trigger trg_update_wardrobe
after insert or update or delete on public.feedback_entries
for each row
execute function private.update_user_wardrobe();

drop function if exists public.adjust_user_wardrobe_item(uuid, text, integer);
drop function if exists public.anonymize_and_pool();
drop function if exists public.update_user_wardrobe();
drop function if exists public.run_prediction_batch();

create or replace function public.run_prediction_batch()
returns void
language sql
security invoker
set search_path = ''
as $$
  select private.run_prediction_batch();
$$;

create or replace function public.delete_own_account()
returns void
language sql
security invoker
set search_path = ''
as $$
  select private.delete_own_account();
$$;

do $$
declare
  fn record;
begin
  for fn in
    select p.oid::regprocedure as signature
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
  loop
    execute format('alter function %s set search_path = public, extensions, pg_temp', fn.signature);
  end loop;
end;
$$;

alter function public.delete_own_account() set search_path = '';

revoke execute on all functions in schema public from public;
revoke execute on all functions in schema public from anon;
revoke execute on all functions in schema public from authenticated;
revoke execute on all functions in schema private from public;
revoke execute on all functions in schema private from anon;
revoke execute on all functions in schema private from authenticated;

grant usage on schema private to authenticated;
grant execute on function private.delete_own_account() to authenticated;
grant execute on function public.delete_own_account() to authenticated;

alter default privileges in schema public revoke execute on functions from public;
alter default privileges in schema public revoke execute on functions from anon;
alter default privileges in schema public revoke execute on functions from authenticated;
alter default privileges in schema private revoke execute on functions from public;
alter default privileges in schema private revoke execute on functions from anon;
alter default privileges in schema private revoke execute on functions from authenticated;

commit;
