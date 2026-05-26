# Android+iOS First Release Plan

Status: not ready for first production release.
Date: 2026-05-16 KST
Scope: Android native, iOS native, shared backend/runtime readiness, dependency/toolchain release gates.

## Review Inputs

- `code-reviewer`: requested changes; native apps are still preview/runtime-incomplete.
- `code-simplifier`: release blockers are tied to local/demo runtime paths, static UI, and duplicated fragile contracts.
- `critic`: `native:readiness` is a build/test gate, not a commercial release gate.
- `debugger`: runtime smoke, logs, live backend behavior, and release env handling are the largest blockers.
- `dependency-expert`: PostCSS/Expo audit, native config drift, Node/JDK pinning, signing, and SBOM remain release tasks.

## No-Ship Criteria

Do not approve the first Android+iOS release while any P0 item below is open.

### P0 Release Blockers

1. iOS real auth/session runtime
   - Current issue: code-level auth/session wiring now exists, but live credential and runtime proof are still missing.
   - Files: `apps/ios-native/PWSNativePreview/Features/AppShell/PwsTabShell.swift`, `apps/ios-native/PWSNativePreview/Features/Login/LoginScreen.swift`, `apps/ios-native/PWSNativePreview/Domain/Session/NativeSupabaseSession.swift`.
   - Work:
     - Keep URLSession Supabase auth client wired to login and `NativeSupabaseSessionStore`.
     - Restore valid Keychain session on launch.
     - Clear Keychain session on sign-out and account deletion.
     - Refresh stale tester credentials and prove good/bad login flows in simulator/device smoke.
   - Acceptance:
     - Fresh tester login, existing tester login, bad password, expired token, relaunch restore, and sign-out all pass in simulator/device smoke with sanitized logs.

2. iOS live weather/profile/feedback/history runtime
   - Current issue: URLSession clients and SwiftUI runtime wiring now exist for auth/weather/feedback/history, but live backend smoke and simulator interaction evidence are still missing.
   - Files: `apps/ios-native/PWSNativePreview/AppEnvironment.swift`, `Features/Home/HomeScreen.swift`, `Domain/Weather/WeatherOneCallContract.swift`, `Domain/Feedback/FeedbackContracts.swift`.
   - Work:
     - Keep Home, Feedback, History, and Settings wired to runtime state instead of static/in-memory data.
     - Add any missing stale-data/error polish found in simulator QA.
     - Prove the weather refresh, feedback submit, and history reload paths against live Supabase.
   - Acceptance:
     - Live Supabase smoke covers profile fetch/upsert, weather refresh, feedback submit, history reload, notification profile update, sign-out.

3. Android production session storage, auth, feedback, and history path
   - Current issue: Android now has encrypted session storage, remote Supabase feedback/history repository wiring, debug install/relaunch proof, QA-signed release login-shell proof, release fail-closed tester auth/feedback fallback behavior, and a release-capable email/password login path that does not bundle tester passwords. Production-signed release runtime proof is still missing, and the remote-login user id contract still needs live evidence on the signed artifact.
   - Files: `apps/android-native/app/src/main/java/com/wxxtae/pws/nativepreview/AndroidKeyValueStore.kt`, `domain/NativeSupabaseSession.kt`, `domain/FeedbackRepository.kt`, `MainActivity.kt`.
   - Work:
     - Keep encrypted storage wired for session material and keep tester credentials out of distributable builds.
     - Keep the release-capable email/password login mechanism available without bundling tester passwords.
     - Keep remote-authenticated sessions mapped to the actual Supabase/app user id; do not continue with a local tester id for profile, feedback, or account deletion calls.
     - Preserve release fail-closed behavior: if remote tester auth is unavailable or fails, do not open a local tester session or navigate past login.
     - Preserve release fail-closed behavior for feedback/history: debug may use local fallback, but release must not silently persist feedback/history locally when Supabase fails.
     - Keep the 2026-05-17 debug shell smoke evidence as a lower gate: install success, top/resumed `MainActivity`, process alive, encrypted prefs present, and no package fatal/ANR in filtered logcat.
     - Keep the 2026-05-17 QA-signed release login-shell evidence as an installability/rendering lower gate: local debug-keystore signature, APK v2/v3 verification, install success, cold launch, top/resumed `MainActivity`, login screenshot/UI hierarchy, limited installed permissions, and sanitized filtered logcat.
     - Run production-signed release install/relaunch smoke against the encrypted store after production signing inputs and valid tester credentials are available.
   - Acceptance:
     - Release APK can sign in with approved production/test auth, uses the Supabase/app user id consistently, fail visibly when remote auth/profile mapping fails, survive restart, refresh profile/weather, submit feedback, sign out, and show no plaintext session material in app storage/logs.

4. Live Supabase/backend verification
   - Current issue: RLS/function behavior is contract-reviewed and native account-deletion RPC clients now exist on Android/iOS, but live behavior is not freshly proven; `npm run supabase:smoke` currently reaches Supabase but fails auth with stale/mismatched tester credentials.
   - Files: `supabase/pws_security_preflight.sql`, `supabase/functions/weather-onecall/index.ts`, shared contracts.
   - Work:
     - Run RLS/policy preflight against target project.
     - Verify profile ownership, feedback uniqueness, tester feedback, and weather auth boundaries.
     - Verify `delete_own_account` through the guarded disposable-account Supabase smoke path with `PWS_SMOKE_DELETE_ACCOUNT=1`, `PWS_SMOKE_DELETE_TESTER_ID`, and `PWS_SMOKE_DELETE_CONFIRM=delete-<tester id>`.
     - Verify weather Edge Function: no token, invalid token, valid token, invalid coordinates, provider/config failure.
   - Acceptance:
     - Sanitized evidence logs prove no cross-user read/write, no privileged backend key leakage to clients, and stable user-facing errors.

5. Runtime smoke and crash evidence on both platforms
   - Current issue: Android debug install/relaunch shell smoke and QA-signed release login-shell smoke are collected, but docs still lack production-signed release runtime proof and live flow evidence for login, onboarding/profile, weather, feedback, history, settings/sign-out.
   - Current iOS environment blocker: active Xcode exposes iOS Simulator SDK 26.5, but available simulator devices are iOS 26.4. `npm run native:ios:build` now passes, while `native:ios:verify` / build-for-testing, concrete simulator runtime interaction, and screenshots need a matching runtime.
   - Files: `docs/migration/native-parity-readiness/smoke-checklist.md`.
   - Work:
     - Android: install/run debug, QA-signed release, and production-signed release candidate APKs as applicable, collect `adb logcat`.
     - iOS: install a matching iOS 26.5 simulator runtime or switch to an Xcode toolchain matching the installed iOS 26.4 runtime, then run `xcodebuild test` or XcodeBuildMCP simulator tests and capture logs/screenshots.
     - Cover startup, login, onboarding, home/weather, feedback, history, settings toggles, sign-out, relaunch.
   - Acceptance:
     - No Android package `FATAL EXCEPTION`/ANR, no Swift crash, no unhandled JS error, no token-bearing logs.

6. iOS runtime configuration injection
   - Current issue: iOS now has an explicit simulator launch-env injection contract and missing-config validation tests, but installed simulator/device runtime proof is still blocked by local simulator availability.
   - Files: `apps/ios-native/PWSNativePreview/Config/PWSConfig.swift`, `apps/ios-native/PWSNativePreview/AppEnvironment.swift`, `apps/ios-native/PWSNativePreview/Features/AppShell/PwsTabShell.swift`.
   - Work:
     - Keep the simulator/test configuration injection contract for smoke runs: launch with `xcrun simctl launch --env EXPO_PUBLIC_SUPABASE_URL=<url> --env EXPO_PUBLIC_SUPABASE_ANON_KEY=<anon-key> --env EXPO_PUBLIC_TEST_PASSWORD=<tester-password> booted com.wxxtae.pws.nativepreview.ios`.
     - Prove missing/bad config produces a controlled login/runtime error.
     - Do not store private backend internals or secret material in app resources.
   - Acceptance:
     - iOS runtime smoke proves good config, missing config, bad config, login, relaunch restore, sign-out, and sanitized logs.

7. Separate release gate from build-readiness gate
   - Current issue: `npm run native:readiness` now emits structured free-account build/test evidence, but it is not release signoff and currently remains blocked by iOS simulator destination mismatch.
   - Work:
     - Keep `native:readiness` as build gate.
     - Add a documented `release-readiness` checklist/gate requiring runtime smoke, live backend smoke, signed artifact evidence, privacy checks, audit/SBOM, and final report.
   - Acceptance:
     - First-release signoff cannot pass on build-only evidence.

### P1 Required Before Store/External Distribution

1. Functional UI parity with runtime state
   - Replace hardcoded native Home/History/weather summaries with typed runtime view models.
   - Keep strict-copy fixture data isolated as QA fixtures, not production screen constants.

2. PWS date/formula parity
   - iOS feedback/history now use the shared 05:00 PWS date boundary and include build-test coverage for 04:59/05:00.
   - Continue formula parity checks during runtime smoke.

3. Fallback-disabled QA
   - Android debug fallback may stay for migration, but release-candidate QA must fail visibly if remote auth/weather/profile/feedback fails.
   - Add tests proving fallback is disabled for release-like runtime.

4. Env and cold-launch validation
   - Test real env, missing env, and bad anon key across Expo/RN and native release paths.
   - Ensure startup failures become controlled UI states, not crashes.
   - Status update: Android background runtime failures now show a visible runtime error instead of crashing the worker thread, and iOS renders runtime errors in the shell.

5. Visual/accessibility runtime audit
   - Capture Android and iOS screenshots for small/standard devices.
   - Verify VoiceOver/TalkBack order, Dynamic Type/accessibility font sizes, keyboard paths, safe areas, and minimum tap targets.

6. Production identity/signing
   - Decide final package IDs/bundle IDs.
   - Produce signed Android AAB/APK with upload key.
   - Produce iOS signed device/archive evidence or document account/provisioning blocker.
   - Remove preview identity from any release candidate intended for external distribution.
   - Current known preview identities: Android `com.wxxtae.pws.nativepreview`, iOS `com.wxxtae.pws.nativepreview.ios`; external distribution must either intentionally use these as preview/test identities or switch to the final production identifiers before signoff.

7. Privacy/store readiness
   - Verify permission prompts and denial flows.
   - Android native location permissions are removed from the release manifest; disclose configured/default weather coordinates instead of device GPS collection.
   - Confirm privacy policy/account deletion/support feedback flows.
   - Status update: iOS account deletion now requires an explicit destructive confirmation before invoking the deletion path; live deletion proof still requires a disposable tester account.
   - Prepare store disclosure inputs for location, auth/account, diagnostics, and user-generated feedback data.

### P2 Hardening And Maintainability

1. Android structured JSON/request layer
   - Replace duplicated hand-rolled JSON/parser logic in auth/profile/weather before expanding more clients.
   - Track AndroidX Security `EncryptedSharedPreferences` deprecation warnings and decide whether to keep the current first-release implementation or migrate to a Keystore-backed DataStore layer before external distribution.

2. Runtime state ownership
   - Move Android orchestration out of `MainActivity` into a lifecycle-aware owner.
   - Give iOS a single runtime/state owner before adding more environment fields.

3. UI file cleanup
   - Split large Android `PwsScreens.kt` by screen/domain after behavior is locked.
   - Remove unused legacy UI helpers.
   - Consider generated/shared design token sources for Android/iOS.

4. SBOM and notices
   - Generate OSS notices/SBOM.
   - Document permissive license paths for transitive dual-license packages.
   - Status update: `npm run release:sbom` now generates `docs/migration/native-parity-readiness/sbom-npm.json` from `package-lock.json`; the generated npm inventory currently has 703 package entries, `status: pass`, and `unknownLicenseCount: 0`.
   - Native dependency/license review lane is generated in `docs/migration/native-parity-readiness/native-dependency-license-review.md`; no native dependency license blocker is currently known.

## Dependency And Toolchain Tasks

1. Resolve `npm audit --omit=dev`
   - Status: local command gate closed on 2026-05-17 KST.
   - Resolution: keep npm override for `postcss@8.5.10`; do not apply npm's suggested Expo 49 downgrade.
   - Follow-up: remove the override only after Expo/Metro depends on a patched PostCSS line directly.

2. Pin release validation runtime
   - Validate Node-based tooling with the project npm lockfile and native build lanes.
   - Keep Android Gradle gates pinned to JDK 21 through `scripts/java21-home.js`.

3. Keep native projects as release source of truth
   - Status: Expo/RN has been archived under `legacy/expo-rn`.
   - Decision: checked-in native projects are the source of truth for this release lane.
   - Follow-up: explicitly verify app scheme, icons, splash, package IDs, permissions, and runtime config in native files before signed artifacts.

4. Required command gate after fixes
   - `npm audit --omit=dev`
   - `npm run typecheck`
   - `npm test`
   - `npm run native:android:release`
   - `npm run native:android:verify`
   - `npm run native:ios:verify`
   - `npm run supabase:smoke`
   - iOS `xcodebuild test` or simulator/device test lane
   - Android/iOS runtime smoke with sanitized logs

## Execution Order

1. Build the release gate artifact and smoke harness.
2. Implement Android encrypted storage and release auth/session proof.
3. Implement iOS auth/session runtime.
4. Implement iOS weather/feedback/history runtime.
5. Connect native UI to runtime view models and fix iOS PWS date parity.
6. Run backend live preflight and Supabase smoke.
7. Resolve npm audit/toolchain/native config drift.
8. Run platform runtime smoke, visual QA, accessibility QA, crash/log review.
9. Produce signed artifact evidence and final release report.

## Stop Condition

First release is eligible only when:

- Every P0 item is closed with fresh evidence.
- Every P1 item is closed or explicitly accepted by product/security.
- `npm audit --omit=dev`, typecheck, JS tests, Android build gates, iOS build gates, runtime smoke, and live backend smoke pass.
- Final report references sanitized logs/screenshots tied to the exact release-candidate commit.
- No known crash, token leak, cross-user access, missing sign-out cleanup, or static/demo data path remains in production release flows.
