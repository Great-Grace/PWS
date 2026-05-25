# Native Migration Command Matrix

This matrix gates any physical Expo/RN move. A command passes only when it is executed successfully in its current/future location or marked non-executable with a concrete reason.

## Current Commands

| Command | Owner Surface | Path-Sensitive Inputs | Future Command | Verification | Rollback / Compatibility Shim | Execution Result | Move Gate |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `npm start` / `expo start` | Expo/RN legacy tester | `package.json`, `app.json`, `assets/` | Keep root-owned for now; after move use `cd apps/expo-tester && npm start` | Metro starts or typecheck remains green | Root shim may `cd apps/expo-tester`; rollback is keeping Expo root-owned. | Not executed; interactive dev server is not needed for this reorg. `npm run typecheck` covers package-root viability. | Required before Expo move |
| `npm run android` | Expo/RN Android | `package.json`, tracked `android/`, `android/settings.gradle`, `android/app/build.gradle` | Keep root-owned for now; future command must run from Expo package root | Android debug build or Expo run succeeds | Keep tracked `android/` under Expo root until Gradle path rewrites are proven. | Not executed; would launch/build Expo Android and is outside the native reorg proof. | Required before Expo move |
| `npm run ios` | Expo/RN iOS tester | `package.json`, `app.json` | Keep root-owned for now; future command must run from Expo package root | iOS run succeeds on Xcode host | Keep Expo package root intact; rollback is no-op because no iOS Expo move happened. | Non-executable on this host: active developer directory is Command Line Tools, not full Xcode. | Required before Expo move |
| `npm run typecheck` | Expo/RN legacy tester | root `tsconfig.json`, `src/`, `tests/` | unchanged while root-owned; future `cd apps/expo-tester && npm run typecheck` | TypeScript exits 0 | Root shim may delegate with explicit `cd`; rollback keeps root command. | Executed successfully in current root. | Required before Expo move |
| `npm test` | Expo/RN legacy tester | root `package.json`, `.tmp-tests`, `src/`, `tests/` | unchanged while root-owned; future `cd apps/expo-tester && npm test` | All node/assert tests pass | Root shim must `cd apps/expo-tester`; rollback keeps root command. | Executed successfully: root node/assert suite passed including native readiness. | Required before Expo move |
| `npm run clean` | Expo/RN dependency maintenance | deletes `node_modules` and `package-lock.json` in current app root | keep app-root only; future command must explicitly `cd apps/expo-tester` | install/cache repair succeeds | Do not add ambiguous root shim; rollback is keeping the command app-root-only. | Not executed; destructive dependency cleanup is not required for migration layout proof. | Must not be root-shimmed ambiguously |
| `npm run android:release` | Expo/RN generated Android | `package.json`, tracked `android/`, `scripts/java21-home.js`, signing envs | unchanged while root-owned; future wrapper must preserve `android/` relative paths | `:app:assembleRelease` succeeds | Keep tracked `android/` root-owned; future shim must preserve `cd android` semantics. | Not executed; release signing/build is outside this reversible reorg pass. | Blocks Expo move |
| `eas update --branch <branch>` | Expo/RN tester delivery | `app.json`, `eas.json`, Expo project id, package deps | unchanged while root-owned; future command must run in Expo app root | update published/listed | Keep Expo project root intact; rollback is branch/update deletion through EAS if needed. | Not executed; external production-like delivery requires explicit release intent. | Blocks Expo move |
| `eas build --profile preview --platform android` | Expo/RN tester binary | `app.json`, `eas.json`, tracked `android/` | unchanged while root-owned | build request accepted/completed | Keep Expo project root intact; rollback is no physical move plus cancelled/ignored EAS build. | Not executed; external build queue is not required for local migration prep. | Blocks Expo move |
| `android/gradlew -p apps/android-native :app:testDebugUnitTest :app:assembleDebug` | Native Android preview | root Expo `android/gradlew`, `apps/android-native/` Gradle project, Android Studio JBR 21, Android SDK via `ANDROID_HOME` or ignored `local.properties` | after move: `android/gradlew -p apps/android-native :app:testDebugUnitTest :app:assembleDebug` | Gradle build succeeds and JUnit XML has 0 failures/errors | Roll back by moving `apps/android-native/` back to `native-android/` and using the previous `-p native-android` path. | Executed successfully with `JAVA_HOME=/Applications/Android Studio.app/Contents/jbr/Contents/Home` and `ANDROID_HOME=/Users/taewoo/Library/Android/sdk`: native tests and debug build passed. | Required after Android-native move |
| Supabase CLI commands | Supabase backend | `supabase/config.toml`, `supabase/functions`, `supabase/migrations` | keep `supabase/` root-owned until CLI workdir support is verified | functions/config command succeeds | Keep `supabase/` root-owned; if moved later, use explicit CLI workdir or root shim after proof. | Not executed; no backend physical move happened in this pass. | Blocks Supabase physical move |

## Native Parity Readiness Commands

These commands are the current evidence path for the native parity readiness lane. They do not approve an Expo/RN physical move by themselves; they record what must pass before final native commercial-readiness acceptance.

| Command | Purpose | Current Status | Notes |
| --- | --- | --- | --- |
| `npm test` | Runs the root Node/assert suite, including `tests/nativeParityReadiness.test.ts`. | Executed successfully after readiness artifacts were present. | Verifies the manifest path and Status-bearing readiness docs, plus the existing root Node/assert suite. |
| `android/gradlew -p apps/android-native :app:testDebugUnitTest :app:assembleDebug` | Verifies Android native unit tests and debug build. | Passed after Figma strict-copy UI reapplication. | Requires Android Studio JBR 21 and Android SDK path in this shell. |
| `android/gradlew -p apps/android-native :app:assembleRelease` | Verifies Android native release packaging. | Passed after Figma strict-copy UI reapplication. | Release is locally buildable; store signing/submission remains out of scope. |
| `xcodegen generate --spec apps/ios-native/project.yml` | Regenerates the iOS native Xcode project from the checked-in spec. | Required before iOS build evidence. | Requires `xcodegen` availability. |
| `xcodebuild -list -project apps/ios-native/PWSNativePreview.xcodeproj` | Confirms the generated project and scheme are visible. | Passed. | CoreSimulator warnings appear, but project/scheme discovery succeeds under full Xcode. |
| `xcodebuild build -project apps/ios-native/PWSNativePreview.xcodeproj -scheme PWSNativePreview -sdk iphonesimulator -derivedDataPath apps/ios-native/.build/DerivedData CODE_SIGNING_ALLOWED=NO` | Verifies iOS simulator SDK build without code signing. | Passed after free-account readiness scripting. | CoreSimulator is unavailable for runtime execution, but simulator SDK build succeeds. |
| `xcodebuild build-for-testing -project apps/ios-native/PWSNativePreview.xcodeproj -scheme PWSNativePreview -sdk iphonesimulator -derivedDataPath apps/ios-native/.build/DerivedData CODE_SIGNING_ALLOWED=NO` | Verifies iOS test bundle build. | Passed after free-account readiness scripting. | `xcodebuild test` still requires a working simulator runtime/device set. |

## Current Decision

Keep Expo/RN physically root-owned and treat it as logical `apps/expo-tester` only in docs. The native Android project can move first because it is a separate Gradle project and keeps preview id `com.wxxtae.pws.nativepreview`.

## Compatibility Rules

- Do not move tracked `android/` into `apps/expo-tester/` until Gradle, EAS, and npm commands have future equivalents.
- If root scripts are added later, they must explicitly `cd` into the owner app instead of relying on ambiguous package-manager cwd behavior.
- Keep `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`, and `EXPO_PUBLIC_TEST_PASSWORD` names through native parity unless an env migration plan replaces them for both platforms.

## Recorded Probe

Full Xcode is selected and project/build commands now pass. Runtime simulator execution remains blocked by CoreSimulatorService/device-set failure on this host.
