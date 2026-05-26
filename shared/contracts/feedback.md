# Feedback Contract

## Owner
- Table: `public.feedback_entries`.
- Shared TypeScript reference: `shared/domain/formulas.ts`.
- Native reference: `apps/android-native/app/src/main/java/com/wxxtae/pws/nativepreview/domain/FeedbackRepository.kt`.
- Security reference: `supabase/pws_security_baseline.sql`, `supabase/migrations/20260504055409_operational_security_hardening.sql`.

## Access
- Authenticated users may select, insert, update, and delete only their own rows.
- RLS identity rule: `user_id = auth.uid()`.
- App-level uniqueness expectation: one row per `(user_id, feedback_date, feedback_slot)`.
- Operational hardening currently removes the older unique index in favor of the active migration state; clients should still avoid duplicate slot submissions.

## Slots And Date
- `feedback_slot`: `morning`, `afternoon`, or `evening`.
- If no slot is supplied, RN and native safely fall back to `afternoon`.
- `feedback_date` uses the PWS day boundary from `getPwsDate` / `PwsFormula.getPwsDate`, not raw device calendar date.

## Input Fields
- Required:
  - `feel_score`: 1-7.
  - `humid_feel`: 1-5.
  - `wind_feel`: 0-3.
  - `clothing`: 1-3.
  - `clothing_items`: clothing item ID array or null.
  - `activity`: 1-3.
  - `feedback_slot`.
- Optional:
  - `sun_exposure`: 0-2.
  - `sleep`: 1-3.
  - `outdoor_hours`: 0-3.

## Weather Snapshot Fields
- `actual_temp`, `actual_humidity`, `actual_wind`, `actual_precip`.
- Optional radiant temperature fields: `actual_tmrt_api`, `tmrt_corrected`.
- Native clients populate snapshots from the current weather state when available.

## Computed Fields
- `clothing_offset`, `activity_offset`, `sleep_offset`.
- `adjusted_feel`, `personal_feel`, `exposure_weight`, `weighted_feel`.
- `env_base`.
- Supabase normalizes these fields in a `BEFORE INSERT OR UPDATE` trigger so Android/iOS/native clients create trainable rows when they submit normalized input plus weather snapshots.
- `env_base` is a literature-anchored baseline: UTCI polynomial approximation for outdoor thermal stress, then ordered-logit calibration from UTCI stress thresholds to the PWS 1-7 label scale.
- `weighted_feel` is kept on the 1-7 prediction scale; exposure weighting should pull personal feedback toward neutral, not multiply the whole score below the rating scale.
- Learned model target is the residual `weighted_feel - env_base`; personal/group offsets use shrinkage toward 0 until enough labels accumulate.

## Side Effects
- Feedback insert refreshes today status, prediction, and feedback count.
- Per-slot perceptron weights on `users` may update in the background.
- Clothing items increment wardrobe counts locally and through the Supabase wardrobe trigger on remote rows.
- Operational hardening anonymizes inserted feedback into `anon_feedback_pool`; clients do not access that pool.

## Support Feedback
- Table: `public.tester_feedback`.
- Native reference: Settings support feedback surfaces in `apps/android-native` and `apps/ios-native`.
- Purpose: app support feedback, distinct from weather-feel records.
- Insert body: `user_id` plus trimmed `message`, capped at 500 characters in UI.
- Authenticated users may insert and read only their own rows.
- Local tester sessions do not write remote rows.
- Admin review should use dashboard or service-role surfaces, not client credentials.

## Migration Gate Coverage
- Backend owner: Supabase tables `public.feedback_entries` and `public.tester_feedback` plus related triggers/RLS in `supabase/`.
- Android reference: `apps/android-native/app/src/main/java/com/wxxtae/pws/nativepreview/domain/FeedbackRepository.kt` and `FeedbackPersistence.kt`.
- Planned iOS adapter: `apps/ios-native/PWS/Sources/Services/Feedback/SupabaseFeedbackRepository.swift`.
- Request shape: authenticated insert/select/update/delete for weather feedback rows; authenticated insert/select for support feedback.
- Response shape: feedback row lists and aggregate counts for history/today state; support feedback returns the inserted/read support record when requested.
- Auth/session assumptions: remote feedback is user-private under `auth.uid()`; local tester sessions persist locally and skip remote support-feedback writes.
- Error shape: missing auth, RLS denial, duplicate slot submission, validation failures, and network/server failures map to stable submit/history/support-feedback messages.
