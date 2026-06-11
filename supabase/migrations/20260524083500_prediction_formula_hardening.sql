-- PWS prediction formula hardening
-- Fixes scale drift in env_base / weighted_feel and makes feedback-derived
-- prediction fields server-owned so every client contributes trainable rows.

begin;

create or replace function public.clamp_feel(p_value numeric)
returns numeric
language sql
immutable
set search_path = ''
as $$
  select greatest(1.0, least(7.0, coalesce(p_value, 4.0)));
$$;

create or replace function public.compute_saturation_vapor_pressure_hpa(p_temp numeric)
returns numeric
language plpgsql
immutable
set search_path = ''
as $$
declare
  v_tk numeric := coalesce(p_temp, 20.0) + 273.15;
  v_value numeric;
begin
  v_value := 2.7150305 * ln(v_tk)
    + -2.8365744e3 * power(v_tk, -2)
    + -6.028076559e3 * power(v_tk, -1)
    + 1.954263612e1
    + -2.737830188e-2 * v_tk
    + 1.6261698e-5 * power(v_tk, 2)
    + 7.0229056e-10 * power(v_tk, 3)
    + -1.8680009e-13 * power(v_tk, 4);

  return exp(v_value) * 0.01;
end;
$$;

create or replace function public.compute_utci_celsius(
  p_temp numeric,
  p_humidity numeric,
  p_wind numeric,
  p_tmrt numeric default null
)
returns numeric
language plpgsql
immutable
set search_path = ''
as $$
declare
  v_temp numeric := greatest(-50.0, least(50.0, coalesce(p_temp, 20.0)));
  v_wind numeric := greatest(0.5, least(17.0, coalesce(p_wind, 0.5)));
  v_tmrt numeric;
  v_d_tmrt numeric;
  v_pa numeric;
  v_offset numeric;
begin
  v_tmrt := greatest(v_temp - 30.0, least(v_temp + 70.0, coalesce(p_tmrt, v_temp)));
  v_d_tmrt := v_tmrt - v_temp;
  v_pa := greatest(
    0.0,
    least(
      50.0,
      public.compute_saturation_vapor_pressure_hpa(v_temp) * greatest(0.0, least(100.0, coalesce(p_humidity, 50.0))) / 100.0
    )
  ) / 10.0;

  select sum(c
    * power(v_temp, ta_exp)
    * power(v_wind, wind_exp)
    * power(v_d_tmrt, tmrt_exp)
    * power(v_pa, pa_exp))
  into v_offset
  from (values
      (6.07562052e-01::numeric, 0, 0, 0, 0),
      (-2.27712343e-02::numeric, 1, 0, 0, 0),
      (8.06470249e-04::numeric, 2, 0, 0, 0),
      (-1.54271372e-04::numeric, 3, 0, 0, 0),
      (-3.24651735e-06::numeric, 4, 0, 0, 0),
      (7.32602852e-08::numeric, 5, 0, 0, 0),
      (1.35959073e-09::numeric, 6, 0, 0, 0),
      (-2.25836520e+00::numeric, 0, 1, 0, 0),
      (8.80326035e-02::numeric, 1, 1, 0, 0),
      (2.16844454e-03::numeric, 2, 1, 0, 0),
      (-1.53347087e-05::numeric, 3, 1, 0, 0),
      (-5.72983704e-07::numeric, 4, 1, 0, 0),
      (-2.55090145e-09::numeric, 5, 1, 0, 0),
      (-7.51269505e-01::numeric, 0, 2, 0, 0),
      (-4.08350271e-03::numeric, 1, 2, 0, 0),
      (-5.21670675e-05::numeric, 2, 2, 0, 0),
      (1.94544667e-06::numeric, 3, 2, 0, 0),
      (1.14099531e-08::numeric, 4, 2, 0, 0),
      (1.58137256e-01::numeric, 0, 3, 0, 0),
      (-6.57263143e-05::numeric, 1, 3, 0, 0),
      (2.22697524e-07::numeric, 2, 3, 0, 0),
      (-4.16117031e-08::numeric, 3, 3, 0, 0),
      (-1.27762753e-02::numeric, 0, 4, 0, 0),
      (9.66891875e-06::numeric, 1, 4, 0, 0),
      (2.52785852e-09::numeric, 2, 4, 0, 0),
      (4.56306672e-04::numeric, 0, 5, 0, 0),
      (-1.74202546e-07::numeric, 1, 5, 0, 0),
      (-5.91491269e-06::numeric, 0, 6, 0, 0),
      (3.98374029e-01::numeric, 0, 0, 1, 0),
      (1.83945314e-04::numeric, 1, 0, 1, 0),
      (-1.73754510e-04::numeric, 2, 0, 1, 0),
      (-7.60781159e-07::numeric, 3, 0, 1, 0),
      (3.77830287e-08::numeric, 4, 0, 1, 0),
      (5.43079673e-10::numeric, 5, 0, 1, 0),
      (-2.00518269e-02::numeric, 0, 1, 1, 0),
      (8.92859837e-04::numeric, 1, 1, 1, 0),
      (3.45433048e-06::numeric, 2, 1, 1, 0),
      (-3.77925774e-07::numeric, 3, 1, 1, 0),
      (-1.69699377e-09::numeric, 4, 1, 1, 0),
      (1.69992415e-04::numeric, 0, 2, 1, 0),
      (-4.99204314e-05::numeric, 1, 2, 1, 0),
      (2.47417178e-07::numeric, 2, 2, 1, 0),
      (1.07596466e-08::numeric, 3, 2, 1, 0),
      (8.49242932e-05::numeric, 0, 3, 1, 0),
      (1.35191328e-06::numeric, 1, 3, 1, 0),
      (-6.21531254e-09::numeric, 2, 3, 1, 0),
      (-4.99410301e-06::numeric, 0, 4, 1, 0),
      (-1.89489258e-08::numeric, 1, 4, 1, 0),
      (8.15300114e-08::numeric, 0, 5, 1, 0),
      (7.55043090e-04::numeric, 0, 0, 2, 0),
      (-5.65095215e-05::numeric, 1, 0, 2, 0),
      (-4.52166564e-07::numeric, 2, 0, 2, 0),
      (2.46688878e-08::numeric, 3, 0, 2, 0),
      (2.42674348e-10::numeric, 4, 0, 2, 0),
      (1.54547250e-04::numeric, 0, 1, 2, 0),
      (5.24110970e-06::numeric, 1, 1, 2, 0),
      (-8.75874982e-08::numeric, 2, 1, 2, 0),
      (-1.50743064e-09::numeric, 3, 1, 2, 0),
      (-1.56236307e-05::numeric, 0, 2, 2, 0),
      (-1.33895614e-07::numeric, 1, 2, 2, 0),
      (2.49709824e-09::numeric, 2, 2, 2, 0),
      (6.51711721e-07::numeric, 0, 3, 2, 0),
      (1.94960053e-09::numeric, 1, 3, 2, 0),
      (-1.00361113e-08::numeric, 0, 4, 2, 0),
      (-1.21206673e-05::numeric, 0, 0, 3, 0),
      (-2.18203660e-07::numeric, 1, 0, 3, 0),
      (7.51269482e-09::numeric, 2, 0, 3, 0),
      (9.79063848e-11::numeric, 3, 0, 3, 0),
      (1.25006734e-06::numeric, 0, 1, 3, 0),
      (-1.81584736e-09::numeric, 1, 1, 3, 0),
      (-3.52197671e-10::numeric, 2, 1, 3, 0),
      (-3.36514630e-08::numeric, 0, 2, 3, 0),
      (1.35908359e-10::numeric, 1, 2, 3, 0),
      (4.17032620e-10::numeric, 0, 3, 3, 0),
      (-1.30369025e-09::numeric, 0, 0, 4, 0),
      (4.13908461e-10::numeric, 1, 0, 4, 0),
      (9.22652254e-12::numeric, 2, 0, 4, 0),
      (-5.08220384e-09::numeric, 0, 1, 4, 0),
      (-2.24730961e-11::numeric, 1, 1, 4, 0),
      (1.17139133e-10::numeric, 0, 2, 4, 0),
      (6.62154879e-10::numeric, 0, 0, 5, 0),
      (4.03863260e-13::numeric, 1, 0, 5, 0),
      (1.95087203e-12::numeric, 0, 1, 5, 0),
      (-4.73602469e-12::numeric, 0, 0, 6, 0),
      (5.12733497e+00::numeric, 0, 0, 0, 1),
      (-3.12788561e-01::numeric, 1, 0, 0, 1),
      (-1.96701861e-02::numeric, 2, 0, 0, 1),
      (9.99690870e-04::numeric, 3, 0, 0, 1),
      (9.51738512e-06::numeric, 4, 0, 0, 1),
      (-4.66426341e-07::numeric, 5, 0, 0, 1),
      (5.48050612e-01::numeric, 0, 1, 0, 1),
      (-3.30552823e-03::numeric, 1, 1, 0, 1),
      (-1.64119440e-03::numeric, 2, 1, 0, 1),
      (-5.16670694e-06::numeric, 3, 1, 0, 1),
      (9.52692432e-07::numeric, 4, 1, 0, 1),
      (-4.29223622e-02::numeric, 0, 2, 0, 1),
      (5.00845667e-03::numeric, 1, 2, 0, 1),
      (1.00601257e-06::numeric, 2, 2, 0, 1),
      (-1.81748644e-06::numeric, 3, 2, 0, 1),
      (-1.25813502e-03::numeric, 0, 3, 0, 1),
      (-1.79330391e-04::numeric, 1, 3, 0, 1),
      (2.34994441e-06::numeric, 2, 3, 0, 1),
      (1.29735808e-04::numeric, 0, 4, 0, 1),
      (1.29064870e-06::numeric, 1, 4, 0, 1),
      (-2.28558686e-06::numeric, 0, 5, 0, 1),
      (-3.69476348e-02::numeric, 0, 0, 1, 1),
      (1.62325322e-03::numeric, 1, 0, 1, 1),
      (-3.14279680e-05::numeric, 2, 0, 1, 1),
      (2.59835559e-06::numeric, 3, 0, 1, 1),
      (-4.77136523e-08::numeric, 4, 0, 1, 1),
      (8.64203390e-03::numeric, 0, 1, 1, 1),
      (-6.87405181e-04::numeric, 1, 1, 1, 1),
      (-9.13863872e-06::numeric, 2, 1, 1, 1),
      (5.15916806e-07::numeric, 3, 1, 1, 1),
      (-3.59217476e-05::numeric, 0, 2, 1, 1),
      (3.28696511e-05::numeric, 1, 2, 1, 1),
      (-7.10542454e-07::numeric, 2, 2, 1, 1),
      (-1.24382300e-05::numeric, 0, 3, 1, 1),
      (-7.38584400e-09::numeric, 1, 3, 1, 1),
      (2.20609296e-07::numeric, 0, 4, 1, 1),
      (-7.32469180e-04::numeric, 0, 0, 2, 1),
      (-1.87381964e-05::numeric, 1, 0, 2, 1),
      (4.80925239e-06::numeric, 2, 0, 2, 1),
      (-8.75492040e-08::numeric, 3, 0, 2, 1),
      (2.77862930e-05::numeric, 0, 1, 2, 1),
      (-5.06004592e-06::numeric, 1, 1, 2, 1),
      (1.14325367e-07::numeric, 2, 1, 2, 1),
      (2.53016723e-06::numeric, 0, 2, 2, 1),
      (-1.72857035e-08::numeric, 1, 2, 2, 1),
      (-3.95079398e-08::numeric, 0, 3, 2, 1),
      (-3.59413173e-07::numeric, 0, 0, 3, 1),
      (7.04388046e-07::numeric, 1, 0, 3, 1),
      (-1.89309167e-08::numeric, 2, 0, 3, 1),
      (-4.79768731e-07::numeric, 0, 1, 3, 1),
      (7.96079978e-09::numeric, 1, 1, 3, 1),
      (1.62897058e-09::numeric, 0, 2, 3, 1),
      (3.94367674e-08::numeric, 0, 0, 4, 1),
      (-1.18566247e-09::numeric, 1, 0, 4, 1),
      (3.34678041e-10::numeric, 0, 1, 4, 1),
      (-1.15606447e-10::numeric, 0, 0, 5, 1),
      (-2.80626406e+00::numeric, 0, 0, 0, 2),
      (5.48712484e-01::numeric, 1, 0, 0, 2),
      (-3.99428410e-03::numeric, 2, 0, 0, 2),
      (-9.54009191e-04::numeric, 3, 0, 0, 2),
      (1.93090978e-05::numeric, 4, 0, 0, 2),
      (-3.08806365e-01::numeric, 0, 1, 0, 2),
      (1.16952364e-02::numeric, 1, 1, 0, 2),
      (4.95271903e-04::numeric, 2, 1, 0, 2),
      (-1.90710882e-05::numeric, 3, 1, 0, 2),
      (2.10787756e-03::numeric, 0, 2, 0, 2),
      (-6.98445738e-04::numeric, 1, 2, 0, 2),
      (2.30109073e-05::numeric, 2, 2, 0, 2),
      (4.17856590e-04::numeric, 0, 3, 0, 2),
      (-1.27043871e-05::numeric, 1, 3, 0, 2),
      (-3.04620472e-06::numeric, 0, 4, 0, 2),
      (5.14507424e-02::numeric, 0, 0, 1, 2),
      (-4.32510997e-03::numeric, 1, 0, 1, 2),
      (8.99281156e-05::numeric, 2, 0, 1, 2),
      (-7.14663943e-07::numeric, 3, 0, 1, 2),
      (-2.66016305e-04::numeric, 0, 1, 1, 2),
      (2.63789586e-04::numeric, 1, 1, 1, 2),
      (-7.01199003e-06::numeric, 2, 1, 1, 2),
      (-1.06823306e-04::numeric, 0, 2, 1, 2),
      (3.61341136e-06::numeric, 1, 2, 1, 2),
      (2.29748967e-07::numeric, 0, 3, 1, 2),
      (3.04788893e-04::numeric, 0, 0, 2, 2),
      (-6.42070836e-05::numeric, 1, 0, 2, 2),
      (1.16257971e-06::numeric, 2, 0, 2, 2),
      (7.68023384e-06::numeric, 0, 1, 2, 2),
      (-5.47446896e-07::numeric, 1, 1, 2, 2),
      (-3.59937910e-08::numeric, 0, 2, 2, 2),
      (-4.36497725e-06::numeric, 0, 0, 3, 2),
      (1.68737969e-07::numeric, 1, 0, 3, 2),
      (2.67489271e-08::numeric, 0, 1, 3, 2),
      (3.23926897e-09::numeric, 0, 0, 4, 2),
      (-3.53874123e-02::numeric, 0, 0, 0, 3),
      (-2.21201190e-01::numeric, 1, 0, 0, 3),
      (1.55126038e-02::numeric, 2, 0, 0, 3),
      (-2.63917279e-04::numeric, 3, 0, 0, 3),
      (4.53433455e-02::numeric, 0, 1, 0, 3),
      (-4.32943862e-03::numeric, 1, 1, 0, 3),
      (1.45389826e-04::numeric, 2, 1, 0, 3),
      (2.17508610e-04::numeric, 0, 2, 0, 3),
      (-6.66724702e-05::numeric, 1, 2, 0, 3),
      (3.33217140e-05::numeric, 0, 3, 0, 3),
      (-2.26921615e-03::numeric, 0, 0, 1, 3),
      (3.80261982e-04::numeric, 1, 0, 1, 3),
      (-5.45314314e-09::numeric, 2, 0, 1, 3),
      (-7.96355448e-04::numeric, 0, 1, 1, 3),
      (2.53458034e-05::numeric, 1, 1, 1, 3),
      (-6.31223658e-06::numeric, 0, 2, 1, 3),
      (3.02122035e-04::numeric, 0, 0, 2, 3),
      (-4.77403547e-06::numeric, 1, 0, 2, 3),
      (1.73825715e-06::numeric, 0, 1, 2, 3),
      (-4.09087898e-07::numeric, 0, 0, 3, 3),
      (6.14155345e-01::numeric, 0, 0, 0, 4),
      (-6.16755931e-02::numeric, 1, 0, 0, 4),
      (1.33374846e-03::numeric, 2, 0, 0, 4),
      (3.55375387e-03::numeric, 0, 1, 0, 4),
      (-5.13027851e-04::numeric, 1, 1, 0, 4),
      (1.02449757e-04::numeric, 0, 2, 0, 4),
      (-1.48526421e-03::numeric, 0, 0, 1, 4),
      (-4.11469183e-05::numeric, 1, 0, 1, 4),
      (-6.80434415e-06::numeric, 0, 1, 1, 4),
      (-9.77675906e-06::numeric, 0, 0, 2, 4),
      (8.82773108e-02::numeric, 0, 0, 0, 5),
      (-3.01859306e-03::numeric, 1, 0, 0, 5),
      (1.04452989e-03::numeric, 0, 1, 0, 5),
      (2.47090539e-04::numeric, 0, 0, 1, 5),
      (1.48348065e-03::numeric, 0, 0, 0, 6)
  ) as terms(c, ta_exp, wind_exp, tmrt_exp, pa_exp);

  return v_temp + coalesce(v_offset, 0);
end;
$$;

create or replace function public.compute_ordinal_feel_from_utci(
  p_utci numeric,
  p_softness numeric default 2.5
)
returns numeric
language plpgsql
immutable
set search_path = ''
as $$
declare
  v_softness numeric := greatest(0.25, coalesce(p_softness, 2.5));
  v_thresholds numeric[] := array[-13.0, 0.0, 9.0, 26.0, 32.0, 38.0];
  v_previous numeric := 0.0;
  v_cumulative numeric;
  v_expected numeric := 0.0;
  i integer;
begin
  for i in 1..array_length(v_thresholds, 1) loop
    v_cumulative := 1.0 / (1.0 + exp(-((v_thresholds[i] - p_utci) / v_softness)));
    v_expected := v_expected + i * greatest(0.0, least(1.0, v_cumulative - v_previous));
    v_previous := v_cumulative;
  end loop;
  v_expected := v_expected + 7.0 * greatest(0.0, least(1.0, 1.0 - v_previous));

  return public.clamp_feel(v_expected);
end;
$$;

create or replace function public.compute_weather_env_base(
  p_temp numeric,
  p_humidity numeric,
  p_wind numeric,
  p_tmrt numeric default null,
  p_precip numeric default 0
)
returns numeric
language plpgsql
immutable
set search_path = ''
as $$
declare
  v_temp numeric := coalesce(p_temp, 20.0);
  v_precip numeric := coalesce(p_precip, 0.0);
  v_utci numeric;
  v_result numeric;
begin
  v_utci := public.compute_utci_celsius(
    v_temp,
    coalesce(p_humidity, 50.0),
    coalesce(p_wind, 0.5),
    coalesce(p_tmrt, v_temp)
  );
  v_result := public.compute_ordinal_feel_from_utci(v_utci)
    - greatest(0.0, least(1.0, v_precip / 10.0)) * 0.25;

  return round(public.clamp_feel(v_result), 3);
end;
$$;

-- Preserve the existing public signature, but reinterpret humidity/wind as
-- real weather values rather than 1-5 subjective feedback scales.
create or replace function public.compute_env_base(
  p_temp numeric,
  p_humid integer,
  p_wind integer,
  p_tmrt numeric,
  p_season text
)
returns numeric
language sql
immutable
set search_path = ''
as $$
  select public.compute_weather_env_base(p_temp, p_humid, p_wind, p_tmrt, 0);
$$;

create or replace function private.normalize_feedback_prediction_fields()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user record;
  v_tmrt numeric;
begin
  select bmi_offset, korea_baseline
    into v_user
    from public.users
   where id = new.user_id;

  new.clothing_offset := (new.clothing - 2) * -0.7;
  new.activity_offset := (new.activity - 2) * 0.5;
  new.sleep_offset := case
    when new.sleep is null then null
    else (new.sleep - 2) * -0.2
  end;

  new.adjusted_feel := new.feel_score
    + new.clothing_offset
    + new.activity_offset
    + coalesce(new.sleep_offset, 0);

  new.personal_feel := public.clamp_feel(
    new.adjusted_feel
    + coalesce(v_user.bmi_offset, 0)
    + coalesce(v_user.korea_baseline, 0.3)
  );

  new.exposure_weight := greatest(0.4, least(1.0, 0.4 + coalesce(new.outdoor_hours, 0) * 0.2));
  new.weighted_feel := public.clamp_feel(4 + (new.personal_feel - 4) * new.exposure_weight);

  if new.actual_tmrt_api is not null and new.tmrt_corrected is null then
    new.tmrt_corrected := new.actual_tmrt_api + coalesce(new.sun_exposure, 0) * 8.0;
  end if;

  v_tmrt := coalesce(new.tmrt_corrected, new.actual_tmrt_api);
  if new.actual_temp is not null
     and new.actual_humidity is not null
     and new.actual_wind is not null then
    new.env_base := public.compute_weather_env_base(
      new.actual_temp,
      new.actual_humidity,
      new.actual_wind,
      v_tmrt,
      coalesce(new.actual_precip, 0)
    );
  end if;

  return new;
end;
$$;

drop trigger if exists feedback_prediction_fields_normalize on public.feedback_entries;
create trigger feedback_prediction_fields_normalize
before insert or update on public.feedback_entries
for each row
execute function private.normalize_feedback_prediction_fields();

create or replace function public.compute_personal_offset(
  p_user_id uuid,
  p_limit integer default 30
)
returns numeric
language plpgsql
set search_path = public, extensions, pg_temp
as $$
declare
  v_sum numeric;
  v_count integer;
begin
  select sum(sub.diff), count(*)
  into v_sum, v_count
  from (
    select (weighted_feel - env_base) as diff
    from public.feedback_entries
    where user_id = p_user_id
      and weighted_feel is not null
      and env_base is not null
      and feedback_date >= current_date - 45
    order by feedback_date desc
    limit p_limit
  ) sub;

  return coalesce(v_sum / nullif(v_count + 7.0, 0), 0.0);
end;
$$;

create or replace function public.compute_group_offset(
  p_zone text,
  p_bmi_bucket text,
  p_season text
)
returns numeric
language plpgsql
set search_path = public, extensions, pg_temp
as $$
declare
  v_sum numeric;
  v_count integer;
begin
  select sum(personal_offset), count(personal_offset)
  into v_sum, v_count
  from public.anon_feedback_pool
  where climate_zone = p_zone
    and bmi_bucket = p_bmi_bucket
    and season = p_season
    and feedback_date >= current_date - interval '90 days'
    and personal_offset is not null;

  return coalesce(v_sum / nullif(v_count + 20.0, 0), 0.0);
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

    if v_weather.temp_c is not null then
      v_env := public.compute_weather_env_base(
        v_weather.temp_c,
        v_weather.humidity_pct,
        v_weather.wind_mps,
        v_weather.tmrt_api,
        0
      );
    else
      v_env := 4.0;
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

create or replace function public.predict_feel(
  p_user_id uuid,
  p_target_date date default current_date + 1,
  p_env_base numeric default null
)
returns table(
  predicted_feel numeric,
  confidence text,
  feedback_count integer,
  personal_offset numeric,
  group_offset numeric,
  blend_weight numeric,
  final_offset numeric
)
language plpgsql
set search_path = public, extensions, pg_temp
as $$
declare
  v_count integer;
  v_p_offset numeric;
  v_g_offset numeric;
  v_w numeric;
  v_f_offset numeric;
  v_user record;
  v_env_base numeric;
begin
  v_env_base := public.clamp_feel(coalesce(p_env_base, 4.0));

  select count(*) into v_count
  from public.feedback_entries
  where user_id = p_user_id;

  select climate_zone, bmi_bucket into v_user
  from public.users
  where id = p_user_id;

  v_p_offset := public.compute_personal_offset(p_user_id);
  v_g_offset := public.compute_group_offset(
    v_user.climate_zone,
    coalesce(v_user.bmi_bucket, 'normal'),
    public.get_season(p_target_date)
  );

  v_w := least(v_count::numeric / 30.0, 1.0);
  v_f_offset := greatest(-2.0, least(2.0, v_g_offset * (1 - v_w) + v_p_offset * v_w));

  return query select
    round(public.clamp_feel(v_env_base + v_f_offset), 2),
    case
      when v_count < 7  then 'cold_start'
      when v_count < 15 then 'low'
      when v_count < 30 then 'medium'
      else                   'high'
    end,
    v_count,
    round(v_p_offset, 3),
    round(v_g_offset, 3),
    round(v_w, 2),
    round(v_f_offset, 3);
end;
$$;

revoke execute on function private.normalize_feedback_prediction_fields() from public;
revoke execute on function private.normalize_feedback_prediction_fields() from anon;
revoke execute on function private.normalize_feedback_prediction_fields() from authenticated;

-- Backfill existing feedback rows through the new normalizer. This is data
-- repair for derived model fields; source user ratings stay unchanged.
update public.feedback_entries
   set feel_score = feel_score;

truncate table public.anon_feedback_pool;

insert into public.anon_feedback_pool (
  id,
  climate_zone, bmi_bucket, age_bucket, gender,
  feedback_date, season, feedback_slot,
  feel_score, humid_feel, wind_feel,
  clothing, activity, sun_exposure, sleep, outdoor_hours,
  actual_temp, actual_humidity, actual_wind, tmrt_corrected,
  weighted_feel, env_base, personal_offset,
  clothing_items
)
select
  gen_random_uuid(),
  coalesce(u.climate_zone, 'unknown'),
  coalesce(u.bmi_bucket, 'unknown'),
  coalesce(u.age_bucket, 'unknown'),
  coalesce(u.gender, 'unknown'),
  f.feedback_date,
  public.get_season(f.feedback_date),
  f.feedback_slot,
  f.feel_score,
  f.humid_feel,
  f.wind_feel,
  f.clothing,
  f.activity,
  f.sun_exposure,
  f.sleep,
  f.outdoor_hours,
  f.actual_temp,
  f.actual_humidity,
  f.actual_wind,
  f.tmrt_corrected,
  f.weighted_feel,
  f.env_base,
  case
    when f.weighted_feel is not null and f.env_base is not null
      then f.weighted_feel - f.env_base
    else null
  end,
  f.clothing_items
from public.feedback_entries f
left join public.users u on u.id = f.user_id;

-- Existing predictions are derived/cache rows from the old off-scale formula.
-- Regenerate them after applying this migration by running public.run_prediction_batch().
delete from public.predictions;

commit;
