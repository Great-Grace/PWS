# PWS Native Workspace

This repository is native-first.

## Production App Surfaces

- iOS: `apps/ios-native/PWSNativePreview.xcodeproj`
- Android: `apps/android-native`
- Backend: `supabase`
- Shared contracts/design notes: `shared`

## Legacy Surface

The old Expo/RN app is archived under `legacy/expo-rn`. It is reference material only and is not the TestFlight or store build path.

Root Expo commands are intentionally disabled. If a build shows the old `앱 시작하기` login flow, it was built from the legacy surface or an old commit.

## iOS TestFlight Build

```bash
git checkout test/simple-login
git pull origin test/simple-login
cd app
open apps/ios-native/PWSNativePreview.xcodeproj
```

In Xcode, archive the `PWSNativePreview` target with bundle id `woos.owndo`.

## Android Native Build

```bash
npm run native:android:debug
npm run native:android:release
```
