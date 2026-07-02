# History Contract

## Owner
- Data source: `public.feedback_entries`.
- Shared reference: `shared/domain/formulas.ts`.
- Native reference: `apps/android-native/app/src/main/java/com/wxxtae/pws/nativepreview/domain/FeedbackRepository.kt`, `apps/android-native/app/src/main/java/com/wxxtae/pws/nativepreview/domain/HistorySummary.kt`.

## Query
- Inputs: authenticated `user_id`, inclusive `startDate`, inclusive `endDate`.
- Date format: `YYYY-MM-DD`.
- RN query:
  - `select('*')`
  - `eq('user_id', userId)`
  - `gte('feedback_date', startDate)`
  - `lte('feedback_date', endDate)`
  - order by `feedback_date` descending and then `feedback_slot` ascending.
- Native in-memory repository filters the same inclusive range and sorts by date plus slot ordinal.

## Access
- History is user-private through `feedback_entries` RLS.
- Local tester sessions return empty remote history.
- Missing auth returns an empty result instead of querying.

## Summary Counts
- `feedbackCount` is total rows for the user.
- `feedbackCountBySlot` contains `morning`, `afternoon`, and `evening` counts.
- Native summary metrics display total, morning, afternoon, and evening counts.
- Dominant slot messaging is derived from the highest slot count.

## Display Rules
- Calendar and record views group entries by `feedback_date`.
- Multiple records on a date are ordered by slot.
- Empty history must remain a valid state with empty arrays and zero counts.

## Migration Gate Coverage
- Backend owner: Supabase table `public.feedback_entries` with user-private RLS.
- Android reference: `apps/android-native/app/src/main/java/com/wxxtae/pws/nativepreview/domain/FeedbackRepository.kt` and `HistorySummary.kt`.
- Planned iOS adapter: `apps/ios-native/PWS/Sources/Services/History/SupabaseHistoryRepository.swift`.
- Request shape: authenticated range query for `feedback_entries` by `user_id`, inclusive `feedback_date` bounds, and stable date/slot ordering.
- Response shape: ordered feedback records plus derived `feedbackCount` and `feedbackCountBySlot` summary values.
- Auth/session assumptions: remote history requires a valid Supabase user session; local tester or missing-auth sessions return empty history without a remote query.
- Error shape: missing auth becomes empty state, while RLS denial, malformed date range, and network/server failures map to stable history error states.
