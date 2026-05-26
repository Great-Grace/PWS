# Users Profile Contract

## Owner
- Table: `public.users`.
- Shared onboarding reference: `shared/domain/onboarding.ts`.
- Native reference: `apps/android-native/app/src/main/java/com/wxxtae/pws/nativepreview/domain/NativeSupabaseProfileClient.kt`.
- Security reference: `supabase/pws_security_baseline.sql`, `supabase/migrations/20260504055409_operational_security_hardening.sql`.

## Access
- Authenticated users may select, insert, update, and delete only their own row.
- RLS identity rule: `id = auth.uid()`.
- Local tester sessions do not write remote profile rows.

## Core Fields
- Identity: `id`, `email`, `nickname`.
- Location: `default_lat`, `default_lng`, `climate_zone`.
- Onboarding: `onboarding_done`.
- Demographics: `birth_year`, `gender` where gender is `M`, `F`, or `N`.
- Body model: `age_bucket`, `bmi_bucket`, `bmi_offset`, `korea_baseline`.
- Notifications: `notify_time`, `notify_enabled`, `notify_outfit`, `notify_rain`, `expo_push_token`.
- Personalization: `weight_morning`, `weight_afternoon`, `weight_evening`, `weight_updated_at`, `wardrobe`.
- Lifecycle: `is_active`, `created_at`, `updated_at`.

## RN Operations
- Fetch: `select('*').eq('id', session.user.id).single()`.
- Onboarding: upsert a row with identity, location, nickname, `onboarding_done: true`, optional birth/gender, and BMI-derived fields when height and weight are present.
- Profile/settings updates: update partial user fields by current session user ID.
- Account delete: call `delete_own_account`, which deletes feedback, tester feedback, profile, and auth user records for `auth.uid()`.

## Native Operations
- Fetch: `GET /rest/v1/users?id=eq.<user-id>&select=*`.
- Onboarding upsert: `POST /rest/v1/users?on_conflict=id` with `Prefer: resolution=merge-duplicates,return=representation`.
- Profile/settings update: `PATCH /rest/v1/users?id=eq.<user-id>` with `Prefer: return=representation`.
- Required headers: `Content-Type`, `Accept`, `apikey`, `Authorization: Bearer <access token>`, `x-client-info: pws-native-android`.

## Derived Behavior
- `climate_zone` splits into province plus district in native profile UI.
- BMI values update `bmi_bucket` and `bmi_offset`.
- Feedback submission may update per-slot weights and `weight_updated_at`.
- Wardrobe counts are maintained locally immediately and by the Supabase wardrobe trigger for remote rows.

## Migration Gate Coverage
- Backend owner: Supabase table `public.users` with RLS and account lifecycle SQL in `supabase/`.
- Android reference: `apps/android-native/app/src/main/java/com/wxxtae/pws/nativepreview/domain/NativeSupabaseProfileClient.kt`.
- Planned iOS adapter: `apps/ios-native/PWS/Sources/Services/Profile/SupabaseProfileClient.swift`.
- Request shape: REST `GET`, `POST ...?on_conflict=id`, and `PATCH` against `/rest/v1/users` with authenticated user filters.
- Response shape: a single profile row containing identity, location, onboarding, demographics, body model, notification, personalization, and lifecycle fields.
- Auth/session assumptions: all remote profile operations require `Authorization: Bearer <access token>` and are scoped to `auth.uid()`; local tester sessions do not write remote rows.
- Error shape: missing auth, RLS denial, validation failures, conflict/upsert failures, and network/server failures map to stable profile/onboarding messages.
