# Expo/RN Legacy Containment

## Status

The Expo/RN app has been physically moved out of the root and archived at:

```text
legacy/expo-rn/
```

It is no longer a release or TestFlight build path.

## Archived Files

- `legacy/expo-rn/App.tsx`
- `legacy/expo-rn/index.ts`
- `legacy/expo-rn/src/`
- `legacy/expo-rn/app.json`
- `legacy/expo-rn/eas.json`
- `legacy/expo-rn/android/`
- `legacy/expo-rn/assets/`
- `legacy/expo-rn/babel.config.js`
- `legacy/expo-rn/metro.config.js`

## Boundary Rules

- PM/build handoff must not use `eas build`, `expo run:ios`, or root `npm run ios`.
- TestFlight must use `apps/ios-native/PWSNativePreview.xcodeproj`.
- Android native must use `apps/android-native`.
- Legacy tests can still read `legacy/expo-rn` as migration evidence, but new product work should land in native apps or shared contracts.

## Guardrail

Root Expo commands intentionally fail through `scripts/native-only-command.js`. This makes accidental legacy builds loud instead of quietly producing the wrong app.
