# PWS Native Android Preview

This is the Kotlin-first native Android migration target. It is intentionally parallel to the current Expo/React Native app until native feature parity is proven.

## Build
From `app/`. The Android SDK must be discoverable through `ANDROID_HOME` or an ignored local `local.properties`.

```bash
android/gradlew -p apps/android-native :app:assembleDebug
```

## Scope
- Kotlin + Jetpack Compose.
- No React Native runtime, Expo runtime, Metro, or JS bundle in this native preview app.
- Preserve PWS design direction from `../../DESIGN.md`; refine Android layout/details only.
- Preview package id is `com.wxxtae.pws.nativepreview` for side-by-side testing. Final cutover to `com.wxxtae.pws` is gated by parity approval.

## Weather edge-function adapter

The native preview now includes a Kotlin adapter for the existing Supabase Edge Function `weather-onecall`:

- Source: `app/src/main/java/com/wxxtae/pws/nativepreview/domain/SupabaseWeatherRemoteSource.kt`
- Build config env inputs: `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`
- Request shape: `POST <supabase-url>/functions/v1/weather-onecall` with `{ "lat": number, "lng": number }`
- Auth: requires a Supabase access token in `Authorization: Bearer ...`
- Runtime behavior: reads a persisted token from `NativeSupabaseSessionStore`, then falls back through `FallbackWeatherRemoteSource` until the native auth/session lane can create and refresh a real token, so emulator QA remains deterministic.

See `.omx/wiki/weather-onecall-contract.md` for the full RN ↔ native contract.
