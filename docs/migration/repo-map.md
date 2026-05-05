# Native Platform Repo Map

## Target Logical Layout

```text
apps/
  android-native/   # Kotlin + Jetpack Compose native app
  ios-native/       # SwiftUI native app
  expo-tester/      # logical owner for current Expo/RN app; physical move is gated
backend/
  supabase/
shared/
  contracts/
  design/
docs/
  migration/
```

## Current Physical Layout

```text
app/
  android/          # tracked Expo/RN Android surface
  apps/android-native/   # untracked Kotlin + Compose preview
  supabase/         # Supabase config, functions, migrations, security SQL
  src/              # Expo/RN source
  DESIGN.md         # strict-copy design authority
```

## Completed First Move

`native-android/` has moved to `apps/android-native/`. The post-move Gradle command is:

```bash
android/gradlew -p apps/android-native :app:testDebugUnitTest :app:assembleDebug
```

## Deferred Moves

- Expo/RN root stays physically in place until command compatibility passes.
- `supabase/` stays in place until CLI path assumptions are checked.
- `DESIGN.md` remains at root and is referenced from `shared/design` rather than moved destructively.
