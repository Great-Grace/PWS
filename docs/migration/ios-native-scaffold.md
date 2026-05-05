# PWS Native iOS Scaffold Spec

Status: buildable initial scaffold. The native iOS app now exists under `apps/ios-native/` with an XcodeGen project, SwiftUI app target, and contract smoke tests. Device-backed simulator tests require an installed simulator runtime/device. Physical-device builds require the matching iOS platform component from Xcode Settings > Components.

Owned target path when created: `apps/ios-native/`.

## Target

Create a SwiftUI-first native iOS preview app that runs in parallel with the Expo/React Native app and the Kotlin native preview until native feature parity is proven.

- Product name placeholder: `PWSNativePreview`
- Preview bundle id placeholder: `com.wxxtae.pws.nativepreview.ios`
- Final bundle id placeholder: `com.wxxtae.pws`
- Minimum platform placeholder: iOS 17.0
- Language/UI: Swift 5.9+, SwiftUI, Observation or `ObservableObject` state depending on the chosen Xcode baseline
- Runtime boundary: no React Native runtime, no Expo runtime, no Metro bundle
- Config inputs: reuse `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`, and optional tester password naming until final native env names are approved

The preview bundle id must stay side-by-side installable. Cutover to `com.wxxtae.pws` is gated by explicit parity approval.

## Source Contracts

The iOS scaffold must mirror the shared contracts already used by RN and native Android instead of inventing an iOS-only product model.

- `DESIGN.md`: visual system, strict-copy policy, tokens, spacing, and screen order.
- `src/types/index.ts`: canonical RN data contracts for `User`, `FeedbackEntry`, `FeedbackInput`, `WeatherData`, `CurrentWeather`, `HourlyForecast`, `DailyForecast`, `FeedbackSlot`, and `ClothingItemId`.
- `src/stores/authStore.ts`: tester login behavior, local tester fallback user, onboarding completion fields, and Supabase profile sync expectations.
- `src/stores/weatherStore.ts`: `weather-onecall` invocation shape and 30-minute cache behavior.
- `src/stores/feedbackStore.ts`: three-slot feedback model, `getPwsDate` day boundary, local prediction shape, feedback insert payload, and on-device weight update behavior.
- `src/config/supabase.ts`: client env requirements and secure session storage constraints.
- `apps/android-native/README.md` and `apps/android-native/app/src/main/java/com/wxxtae/pws/nativepreview/domain/*`: current native contract examples for Supabase auth, profile, session storage, weather, and runtime reducers.
- `.omx/wiki/weather-onecall-contract.md` if present in the working tree: RN/native weather edge-function contract referenced by the Android preview.

## Strict-Copy Nodes

Use the strict-copy page as the first visual reference, matching `DESIGN.md`.

- Figma file: `Temp_app_DesignSystem`
- Strict-copy page: `PWS_STRICT_COPY_ANDROID_2026-05-03`
- Page id: `94:2`
- Handoff namespace: `pws.strictCopy`

Initial screen nodes:

| Screen | Strict Node | Source Node | iOS scaffold policy |
| --- | --- | --- | --- |
| Home | `94:8` | `82:2` | First screen, iOS-native layout with tab shell parity |
| Feedback | `94:174` | `84:2` | Preserve slot selector, scale order, submit state |
| History | `94:347` | `84:174` | Preserve summary and record list order |
| Settings | `94:625` | `84:451` | Preserve utility row hierarchy and account actions |
| WeatherDetail | `94:863` | `84:688` | Preserve forecast/detail hierarchy after Home parity |

iOS may refine exact spacing, typography baseline, navigation chrome, and control primitives when the result is more stable and native. It must preserve hierarchy, visible copy meaning, default selected states, section order, and dev parity demo data.

## Proposed Tree

The scaffold starts with this tree and should grow toward the full parity structure:

```text
apps/ios-native/
  README.md
  project.yml
  PWSNativePreview.xcodeproj/
  PWSNativePreview/
    PWSNativePreviewApp.swift
    AppEnvironment.swift
    Config/
      PWSConfig.swift
      Secrets.example.xcconfig
    Design/
      PWSTokens.swift
      PWSTheme.swift
      PWSComponents.swift
    Domain/
      Models/
        User.swift
        Feedback.swift
        Weather.swift
      Session/
        SessionState.swift
        TesterAuth.swift
        SupabaseSessionStore.swift
      Weather/
        WeatherRepository.swift
        SupabaseWeatherRemoteSource.swift
      Feedback/
        FeedbackRepository.swift
        PwsDate.swift
        PwsFormula.swift
        PredictionConfidence.swift
      Profile/
        SupabaseProfileClient.swift
    Features/
      AppShell/
        PwsTabShell.swift
      Home/
        HomeScreen.swift
        HomeViewModel.swift
      Feedback/
        FeedbackScreen.swift
        FeedbackViewModel.swift
      History/
        HistoryScreen.swift
        HistoryViewModel.swift
      Settings/
        SettingsScreen.swift
        SettingsViewModel.swift
      WeatherDetail/
        WeatherDetailScreen.swift
        WeatherDetailViewModel.swift
      Onboarding/
        AgreementScreen.swift
        ProfileSetupScreen.swift
    Resources/
      Assets.xcassets
      Info.plist
  PWSNativePreviewTests/
    Contract/
      SupabaseAuthContractTests.swift
      SupabaseProfileContractTests.swift
      SupabaseWeatherContractTests.swift
    Domain/
      PwsDateTests.swift
      PwsFormulaTests.swift
      FeedbackRepositoryTests.swift
      SessionReducerTests.swift
      TesterAuthTests.swift
    UIState/
      HomeViewModelTests.swift
      FeedbackViewModelTests.swift
```

## Initial Modules

### App Shell

- `PWSNativePreviewApp.swift`: build `AppEnvironment`, choose tester/dev startup path, and launch `PwsTabShell`.
- `AppEnvironment.swift`: owns repositories and config injection. Keep networking behind protocols so contract tests can use recording transports.
- `PwsTabShell.swift`: SwiftUI tab shell with Home, Feedback, History, Settings, and WeatherDetail navigation from the Home flow.

### Design

- `PWSTokens.swift`: exact `DESIGN.md` colors, spacing, radius, type roles, and one action blue.
- `PWSTheme.swift`: semantic text styles and platform-safe color access.
- `PWSComponents.swift`: primary/secondary pill buttons, section rows, quiet cards, feedback scales, segmented slot control, and loading/error states.

Do not add decorative gradients, emoji-driven navigation, nested cards, or a second accent family.

### Domain Models

Mirror `src/types/index.ts`:

- `FeedbackSlot`: `morning`, `afternoon`, `evening`
- `ClothingItemId`: preserve the RN string ids exactly for Supabase payload compatibility
- `User`: preserve Supabase column names at the encoding boundary and use Swift-style property names internally
- `FeedbackEntry` and `FeedbackInput`: preserve scale ranges and optional correction fields
- `WeatherData`, `CurrentWeather`, `HourlyForecast`, `DailyForecast`: preserve JSON field names from `weather-onecall`

### Session And Auth

- `TesterAuth.swift`: port tester id normalization, local tester session ids, and dev tester modes from RN/Android.
- `SessionState.swift`: reducer-style state for session, agreements, profile draft, notification toggles, and sign-out.
- `SupabaseSessionStore.swift`: Keychain-backed access token, refresh token, expiry, and user id storage. Never log tokens.
- `SupabaseAuthClient.swift`: password grant request matching Android's `NativeSupabaseAuthContract`.

### Supabase Adapters

All adapters should use `URLSession` plus small request builders first. Do not adopt a Supabase Swift SDK until the dependency lane approves it.

- `SupabaseAuthClient`
  - Endpoint: `POST <supabase-url>/auth/v1/token?grant_type=password`
  - Headers: `Content-Type: application/json`, `Accept: application/json`, `apikey`, `x-client-info: pws-native-ios`
  - Body: `{ "email": string, "password": string }`
  - Output: access token, optional refresh token, optional expiry, user id, user email
- `SupabaseProfileClient`
  - Fetch: `GET <supabase-url>/rest/v1/users?id=eq.<user-id>&select=*`
  - Upsert onboarding: `POST <supabase-url>/rest/v1/users?on_conflict=id`
  - Update profile: `PATCH <supabase-url>/rest/v1/users?id=eq.<user-id>`
  - Headers: anon key plus `Authorization: Bearer <access-token>`, with `Prefer` where Android uses it
- `SupabaseWeatherRemoteSource`
  - Endpoint: `POST <supabase-url>/functions/v1/weather-onecall`
  - Body: `{ "lat": number, "lng": number }`
  - Headers: anon key plus `Authorization: Bearer <access-token>`
  - Cache: 30-minute TTL keyed by exact lat/lng, matching RN `weatherStore`
- `FeedbackRepository`
  - Today status: `feedback_entries` for current `getPwsDate`, ordered by `feedback_slot`
  - Submit: insert the RN payload shape from `feedbackStore`, including weather snapshot and computed intermediates
  - History: query by user id and date range
  - Local dev tester mode: deterministic no-op remote writes like RN/Android

## First Screen Parity Order

Build parity in this order so each screen lands on stable contracts before wider polish:

1. Home `94:8`: tab shell, weather insight, supporting insights, local tester profile copy, loading/error/refresh states.
2. Feedback `94:174`: slot selection, current prediction state, required scales, clothing items, submit disabled/saving/success/error states.
3. History `94:347`: feedback count, recent entries, empty state, date range query state.
4. Settings `94:625`: profile rows, notification toggles, sign-out, account deletion entry point as disabled or documented if not implemented.
5. WeatherDetail `94:863`: current, hourly, daily, precipitation/UV/detail hierarchy.
6. Onboarding and agreement screens: required for non-dev sessions, but should not block Home dev parity if local tester mode is active.

## Verification Commands

From `app/`:

```bash
xcodegen generate --spec apps/ios-native/project.yml
xcodebuild -list -project apps/ios-native/PWSNativePreview.xcodeproj
xcodebuild build -project apps/ios-native/PWSNativePreview.xcodeproj -scheme PWSNativePreview -destination 'generic/platform=iOS Simulator' -derivedDataPath apps/ios-native/.build/DerivedData CODE_SIGNING_ALLOWED=NO
xcodebuild build-for-testing -project apps/ios-native/PWSNativePreview.xcodeproj -scheme PWSNativePreview -destination 'generic/platform=iOS Simulator' -derivedDataPath apps/ios-native/.build/DerivedData CODE_SIGNING_ALLOWED=NO
```

Run device-backed tests after at least one iOS simulator runtime and device are installed:

```bash
xcrun simctl list runtimes
xcrun simctl list devices available
xcodebuild test -project apps/ios-native/PWSNativePreview.xcodeproj -scheme PWSNativePreview -destination 'platform=iOS Simulator,name=<device name>' -derivedDataPath apps/ios-native/.build/DerivedData CODE_SIGNING_ALLOWED=NO
```

Run physical-device builds after Xcode lists the device as an eligible destination:

```bash
xcrun devicectl list devices
xcodebuild -showdestinations -project apps/ios-native/PWSNativePreview.xcodeproj -scheme PWSNativePreview
xcodebuild build -project apps/ios-native/PWSNativePreview.xcodeproj -scheme PWSNativePreview -destination 'platform=iOS,id=<device id>' -derivedDataPath apps/ios-native/.build/DerivedData
```

Current physical-device blocker observed during setup:

```text
iOS 26.4 is not installed. Please download and install the platform from Xcode > Settings > Components.
```

Before claiming parity for any screen:

- Run the relevant unit tests above.
- Run a simulator build.
- Capture and compare Home/Feedback/History/Settings/WeatherDetail screenshots against the strict-copy nodes.
- Confirm no copied implementation/debug text leaks into release UI.

## README Stub For Future Project

When `apps/ios-native/` is created, its README should include:

````markdown
# PWS Native iOS Preview

SwiftUI-first native iOS migration target for PWS. This preview app runs beside the Expo/RN app until parity is approved.

Preview bundle id: `com.wxxtae.pws.nativepreview.ios`
Final bundle id placeholder: `com.wxxtae.pws`

## Build

From `app/`:

```bash
xcodebuild -list -project apps/ios-native/PWSNativePreview.xcodeproj
xcodebuild test -project apps/ios-native/PWSNativePreview.xcodeproj -scheme PWSNativePreview -destination 'platform=iOS Simulator,name=iPhone 16'
xcodebuild build -project apps/ios-native/PWSNativePreview.xcodeproj -scheme PWSNativePreview -destination 'generic/platform=iOS Simulator'
```

## Scope

- SwiftUI native preview.
- No React Native runtime, Expo runtime, Metro, or JS bundle.
- Preserve `DESIGN.md` and strict-copy nodes before iOS-native refinement.
- Reuse RN/Supabase contracts for auth, users, weather, feedback, and local tester behavior.
````

## Open Gates

- XcodeGen is the initial project generator; revisit only if it becomes a maintenance burden.
- Decide whether to keep direct `URLSession` adapters or approve a Supabase Swift SDK dependency.
- Install/select an iOS simulator runtime and choose the simulator destination name available in CI.
- Install the matching iOS physical-device platform component before iPhone/iPad deployment.
- Confirm whether iOS cutover uses a fresh App Store bundle id migration or reuses the existing production id after parity.
