# Weather OneCall Contract

## Owner
- Runtime surface: Supabase Edge Function `weather-onecall`.
- Server reference: `supabase/functions/weather-onecall/index.ts`.
- RN client reference: `src/stores/weatherStore.ts`.
- Native client reference: `apps/android-native/app/src/main/java/com/wxxtae/pws/nativepreview/domain/SupabaseWeatherRemoteSource.kt`.
- Existing notes: `.omx/wiki/weather-onecall-contract.md`, `.omx/wiki/weather-onecall-auth-native.md`.

## Request
- Method: `POST`.
- URL: `<EXPO_PUBLIC_SUPABASE_URL>/functions/v1/weather-onecall`.
- Body: `{ "lat": number, "lng": number }`.
- Required headers:
  - `Content-Type: application/json`
  - `Accept: application/json`
  - `apikey: <EXPO_PUBLIC_SUPABASE_ANON_KEY>`
  - `Authorization: Bearer <Supabase access token>`
  - `x-client-info: pws-native-android` for current Android native callers.

## Auth And Validation
- Caller must be an authenticated Supabase user. Missing or invalid bearer tokens return an auth error.
- Coordinates must be finite and within latitude/longitude bounds.
- Non-`POST` methods are rejected except `OPTIONS`.

## Server Behavior
- Weather cache lookup/upsert rounds coordinates to 2 decimals.
- Cache TTL is 30 minutes.
- OpenWeather One Call is requested with `exclude=minutely,alerts`, `units=metric`, and `lang=kr`.
- Operational hardening moves direct weather cache writes behind the Edge Function; clients should not depend on public `weather_cache` writes.

## Response
- `current`: `temp`, `feels_like`, `humidity`, `wind_speed`, `weather_code`, `weather_desc`, `uv_index`, optional `precipitation_1h`, optional `tmrt_api`.
- `hourly[]`: `dt`, `temp`, `feels_like`, `humidity`, `wind_speed`, `weather_code`, `weather_desc`, `pop`, optional `precipitation_1h`.
- `daily[]`: `dt`, `temp_min`, `temp_max`, `humidity`, `wind_speed`, `weather_code`, `weather_desc`, `weather_icon`, `pop`, `uv_index`.
- `fetchedAt`: epoch milliseconds.

## Client Rules
- RN invokes `supabase.functions.invoke<WeatherData>('weather-onecall', { body: { lat, lng } })`.
- Native builds the same HTTP request explicitly and normalizes missing or null `daily.weather_icon` to `""`.
- Native may keep `FallbackWeatherRemoteSource` during migration QA when token/env setup is absent.

## Migration Gate Coverage
- Backend owner: Supabase Edge Function `supabase/functions/weather-onecall/index.ts`.
- Android reference: `apps/android-native/app/src/main/java/com/wxxtae/pws/nativepreview/domain/SupabaseWeatherRemoteSource.kt`.
- Planned iOS adapter: `apps/ios-native/PWS/Sources/Services/Weather/WeatherOneCallClient.swift`.
- Request shape: `POST` JSON body `{ "lat": number, "lng": number }` with Supabase anon key and bearer access token headers.
- Response shape: `current`, `hourly[]`, `daily[]`, and `fetchedAt` as listed above.
- Auth/session assumptions: a valid Supabase access token is required for remote weather; local tester preview data is allowed only as a migration QA fallback.
- Error shape: non-2xx responses may include `{ "error": "unauthorized" | "invalid_coordinates" | "server_not_configured" | "weather_provider_error" | string }`; clients map these to stable user-facing weather errors.
