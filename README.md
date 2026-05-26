# PWS Native Workspace

This repository is native-first.

## Production App Surfaces

- iOS: `apps/ios-native/PWSNativePreview.xcodeproj`
- Android: `apps/android-native`
- Backend: `supabase`
- Shared contracts/design notes: `shared`

## Removed Legacy Surface

The old cross-platform app has been removed from this release workspace. Historical code is available only through Git history before commit `26bfba1`.

Root legacy mobile commands are intentionally disabled. If a build shows the old `앱 시작하기` login flow, it was built from an old commit, not this workspace.

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
