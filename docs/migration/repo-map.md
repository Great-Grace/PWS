# Native Platform Repo Map

## Current Physical Layout

```text
app/
  apps/
    ios-native/       # SwiftUI iOS app; TestFlight source of truth
    android-native/   # Kotlin + Jetpack Compose Android app
  supabase/           # shared backend: config, migrations, Edge Functions, manual SQL
  shared/             # shared contracts and design notes
  docs/
  scripts/
  tests/
```

## Build Boundary

- iOS release/TestFlight builds must use `apps/ios-native/PWSNativePreview.xcodeproj`.
- Android native builds must use `apps/android-native`.
- Root legacy mobile commands are disabled by `scripts/native-only-command.js`.
- Historical cross-platform app code must be inspected through Git history, not the release workspace.

## Backend Boundary

Both native apps use the same Supabase backend:

- Auth: Supabase Auth
- Profile/feedback/history/account deletion: Supabase REST/RPC
- Weather: `supabase/functions/weather-onecall`
- Schema/security changes: `supabase/migrations` and `supabase/manual`

## Canonical Commands

```bash
npm run native:ios:build
npm run native:ios:verify
npm run native:android:test
npm run native:android:verify
npm run testflight:accounts
```
