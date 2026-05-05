# Expo/RN Legacy Tester Containment

## Role

The Expo/RN app is now the tester/reference surface, not the target production architecture. It remains useful for:

- Expo Go or EAS tester delivery.
- Comparing native Android/iOS behavior against the current product flow.
- Preserving known-good Supabase, weather, feedback, onboarding, and Figma strict-copy UI behavior while native apps catch up.

## Current Owned Files

Keep these root-owned until the command matrix proves a physical move:

- `App.tsx`
- `src/`
- `tests/`
- `package.json`
- `package-lock.json`
- `app.json`
- `eas.json`
- tracked `android/`
- Expo assets under `assets/`
- Expo/RN helper scripts under `scripts/`

## Boundary Rules

- Tester-only auth behavior must not become the native production auth policy.
- Expo update/build workflows remain for tester delivery only.
- Native Android/iOS should consume shared contracts and `DESIGN.md`; they should not copy Expo implementation details blindly.
- Expo physical move to `apps/expo-tester/` is optional and blocked until `docs/migration/command-matrix.md` passes.

## Cleanup Path

1. Keep Expo/RN root-owned during Android/iOS native bootstrap.
2. Treat it as logical `apps/expo-tester` in docs.
3. Once native Android and iOS reach parity, choose one:
   - archive Expo/RN as `apps/expo-tester/`
   - remove it after a final tag
   - keep it as a permanent QA harness
4. Only then remove Expo-specific production assumptions from native release planning.
