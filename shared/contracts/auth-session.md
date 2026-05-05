# Auth Session Contract

## Owner
- RN auth reference: `src/stores/authStore.ts`.
- Native auth reference: `apps/android-native/app/src/main/java/com/wxxtae/pws/nativepreview/domain/NativeSupabaseAuthClient.kt`.
- Native session storage reference: `apps/android-native/app/src/main/java/com/wxxtae/pws/nativepreview/domain/NativeSupabaseSession.kt`.
- Existing notes: `.omx/wiki/weather-onecall-auth-native.md`.

## Tester Login
- Tester IDs normalize before use.
- Tester email shape is `<tester-id>@test.pws`.
- Password auth uses `EXPO_PUBLIC_TEST_PASSWORD` when configured.
- Native password grant endpoint is `<SUPABASE_URL>/auth/v1/token?grant_type=password`.
- Native password grant body is `{ "email": string, "password": string }`.
- Native password grant headers are `Content-Type`, `Accept`, `apikey`, and `x-client-info: pws-native-android`.

## Session Shape
- Required access token: `access_token`.
- Optional refresh token: `refresh_token`.
- Expiry may arrive as `expires_at` or be derived from `expires_in`.
- Optional user fields include `user.id` and `user.email`.

## Native Persistence
- Storage abstraction: `NativeSupabaseSessionStore` over `NativeKeyValueStore`.
- Persisted keys:
  - `supabase.access_token`
  - `supabase.refresh_token`
  - `supabase.expires_at_epoch_seconds`
  - `supabase.user_id`
- `getValidAccessToken()` rejects blank tokens and tokens expiring within a 60 second skew.
- Sign-out clears the persisted Supabase session.

## Local Tester Fallback
- Local tester sessions use deterministic local session IDs and do not call Supabase.
- Local tester sign-out only clears local auth state.
- Remote-only APIs must skip or fallback when `isLocalTesterSessionId(user.id)` is true.

## Error Semantics
- Invalid credentials show a user-facing login failure.
- Email confirmation, signup disabled, invalid API key, rate limit, and server failures map to stable native messages.
- Auth errors should not leak raw token, password, or request body data into logs.

## Migration Gate Coverage
- Backend owner: Supabase Auth REST API and auth session persistence.
- Android reference: `apps/android-native/app/src/main/java/com/wxxtae/pws/nativepreview/domain/NativeSupabaseAuthClient.kt` and `NativeSupabaseSession.kt`.
- Planned iOS adapter: `apps/ios-native/PWS/Sources/Services/Auth/SupabaseAuthClient.swift` and `SupabaseSessionStore.swift`.
- Request shape: password grant `POST <SUPABASE_URL>/auth/v1/token?grant_type=password` with `{ "email": string, "password": string }`.
- Response shape: `access_token`, optional `refresh_token`, expiry via `expires_at` or `expires_in`, and optional `user.id` / `user.email`.
- Auth/session assumptions: tester login can be local-only or Supabase-backed; remote-only APIs require a non-expired Supabase access token.
- Error shape: auth failures normalize to invalid credentials, email confirmation required, signup disabled, invalid API key, rate limit, or server failure without exposing secrets.
