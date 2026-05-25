# Native Smoke Checklist

Status: free-account simulator build gates partially pass; Android debug and QA-signed release login-shell smoke are partially collected; iOS login-shell plus authenticated simulator smoke is partially collected; live Supabase weather/write smoke now passes.
Evidence status: `blocked`

## Scope
- Platforms: Android native and iOS native.
- Account boundary: free-account simulator/build-test path only.
- Out of scope: paid account setup, external store submission, production bundle identity cutover, and live write-path smoke without an approved tester-data plan.
- First-release signoff uses the separate `npm run release:readiness` no-ship harness; this checklist records smoke evidence for that gate.

## Scenarios
| Scenario | Android | iOS | Evidence |
| --- | --- | --- | --- |
| Login/tester session | Debug install/relaunch shell smoke passed; QA-signed release APK launches to login; live Supabase tester credentials now pass in sanitized backend smoke | Built simulator app installs, launches, accepts live tester credentials, and enters the authenticated home shell | `npm run supabase:smoke` passes after `weather-onecall` version 3 deployment; Android QA-signed release evidence is in `android-release-qa-signed-runtime-smoke.md`; iOS authenticated evidence is in `ios-simulator-runtime-smoke.md` |
| Onboarding/profile | Debug activity resumed and QA-signed release login shell resumed; backend profile seed/upsert path passed for smoke users | Login shell resumed; backend profile seed/upsert path passed for smoke users | Android package process stayed alive with no package fatal/ANR in filtered logcat; iOS simulator process launched as `com.wxxtae.pws.nativepreview.ios`; direct Supabase profile smoke passed on 2026-05-18 KST |
| Home/weather refresh | Debug activity resumed; live weather proof now passes in Supabase smoke | Authenticated home shell renders; live weather proof now passes in Supabase smoke | `weather-onecall` version 3 returns current weather through OpenWeather when configured, or Open-Meteo fallback when `OPENWEATHER_API_KEY` is absent |
| Feedback submit | Build/unit covered; direct backend write/cleanup smoke passed | Feedback repository/build covered; direct backend write/cleanup smoke passed | 2026-05-18 KST direct smoke inserted one feedback row for the primary smoke tester and deleted it |
| History count | Build/unit covered; backend auth/RLS path passed, full harness still stops at weather before history count | History/count repository/build covered; backend auth/RLS path passed, full harness still stops at weather before history count | Rerun full harness after weather Edge Function config is fixed |
| Settings/sign-out | Build/unit covered; disposable account deletion RPC passed | Contract/build covered; disposable account deletion RPC passed | `smoke_delete_01@test.pws` was deleted via `delete_own_account`; post-delete sign-in returned HTTP 400 |

## Android Simulator/Build Evidence
- Required command path for the free-account gate: `npm run native:android:verify`.
- Optional runtime path: `android/gradlew -p apps/android-native :app:installDebug` when an emulator is available.
- If runtime is unavailable, record the blocker: no emulator, boot failure, Android SDK issue, signing/build failure, or runtime crash.
- Local build evidence passed on 2026-05-17 KST with Android Studio JBR 21 and `ANDROID_HOME=/Users/taewoo/Library/Android/sdk`: `:app:testDebugUnitTest`, `:app:assembleDebug`, and `:app:assembleRelease`. This includes Android encrypted session storage wiring.
- Debug runtime smoke on 2026-05-17 KST with AVD `Testing`: `adb install -r apps/android-native/app/build/outputs/apk/debug/app-debug.apk` returned `Success`; `adb shell am start -W -n com.wxxtae.pws.nativepreview/.MainActivity` relaunched the top activity with `Status: ok`; `dumpsys activity activities` showed `topResumedActivity=ActivityRecord{... com.wxxtae.pws.nativepreview/.MainActivity ...}`; `pidof` returned process `2351`.
- Encrypted-storage runtime proof on 2026-05-17 KST: `run-as com.wxxtae.pws.nativepreview ls shared_prefs` showed both `pws-native-preview.xml` and `pws-native-secure.xml`.
- Filtered Android logcat on 2026-05-17 KST showed no package `FATAL EXCEPTION`, no package ANR, and no package activity startup exception. The AVD was extremely slow during cold boot, so system-app ANRs were present and the first cold-start command timed out before the activity was displayed.
- Screenshot capture remains uncollected because `adb shell screencap` hung on this AVD. Use screenshot evidence only after a stable emulator/device capture path is available.
- QA-signed release runtime smoke on 2026-05-17 KST: the unsigned release APK was signed locally with the Android debug keystore for emulator installability only, `apksigner verify` passed with v2/v3 schemes, `adb install -r` returned `Success`, and `adb shell am start -W -n com.wxxtae.pws.nativepreview/.MainActivity` cold-launched with `Status: ok`.
- QA-signed release process evidence: `adb shell pidof com.wxxtae.pws.nativepreview` returned process `7491`; `dumpsys activity activities` showed `topResumedActivity=ActivityRecord{... com.wxxtae.pws.nativepreview/.MainActivity ...}`; `pm path` returned the installed base APK path.
- QA-signed release permission evidence: `dumpsys package` showed requested permissions limited to `android.permission.INTERNET`, `com.wxxtae.pws.nativepreview.DYNAMIC_RECEIVER_NOT_EXPORTED_PERMISSION`, and `android.permission.VIBRATE`; no coarse/fine location permission was present.
- QA-signed release artifacts: `docs/migration/native-parity-readiness/android-release-qa-signed-runtime-smoke.md`, `android-release-qa-signed-login.png`, `android-release-qa-signed-window.xml`, and `android-release-qa-signed-logcat.txt`.
- Production release install/live-flow smoke remains required because the QA-signed APK uses the local debug keystore and live auth/backend flows remain blocked by tester credentials.

## iOS Simulator/Build Evidence
- Required command paths for the free-account gate: `npm run native:ios:build` and `npm run native:ios:build-for-testing`.
- Required build shape: app build uses a generic iOS Simulator destination; build-for-testing should use an eligible iOS Simulator destination with signing disabled.
- Optional runtime path: `xcodebuild test` or XcodeBuildMCP `test_sim` when CoreSimulatorService can provide a bootable simulator destination.
- `npm run native:ios:verify` passed in the repeatable 2026-05-18 KST aggregate after installing iOS 26.5 simulator runtime with `xcodebuild -downloadPlatform iOS`.
- Concrete runtime execution no longer blocks on missing iOS 26.5 runtime. Authenticated login/home screenshot evidence is collected, but full authenticated flow QA remains separate first-release evidence.
- iOS Keychain entitlement fix on 2026-05-18 KST: `PWSNativePreview.entitlements` was added and linked through `CODE_SIGN_ENTITLEMENTS`; Xcode generated simulator entitlements containing `application-identifier` and `keychain-access-groups`. This closed the Keychain `-34018` login persistence failure observed after a successful Supabase Auth HTTP 200 response.
- iOS login-shell runtime smoke on 2026-05-17 KST: XcodeBuildMCP booted iPhone 17 `C721B497-AB6E-4C1F-B5B5-3166CDD0E4DD`, installed `PWSNativePreview.app`, launched bundle id `com.wxxtae.pws.nativepreview.ios`, captured `ios-simulator-login-shell.jpg`, and captured an accessibility hierarchy for the login shell.
- Authenticated runtime smoke on 2026-05-18 KST: XcodeBuildMCP installed the entitlements-updated simulator app on iPhone 17 iOS 26.5, launched it with public Supabase config from `.env`, entered the tester ID through UI automation, and reached the authenticated home shell. Screenshot evidence is `ios-simulator-26-5-authenticated-weather-blocked.jpg`. That screenshot was captured before the `weather-onecall` version 3 deployment; backend weather smoke now passes.

## Supabase Smoke Evidence
- `npm run supabase:smoke` was added as a sanitized live read-path harness for auth, profile, weather Edge Function, invalid/unauthenticated weather denial, today feedback, history, and feedback count. If `PWS_SMOKE_OTHER_TESTER_ID` is provided, it also proves second-user profile/feedback reads do not expose the primary tester rows.
- 2026-05-18 KST: outbound network to the target Supabase project succeeded and the configured tester credentials authenticated. The harness now reads `PWS_SMOKE_*` values from `.env` as well as process env, so local `.env` smoke configuration is repeatable.
- 2026-05-18 KST: `weather-onecall` version 3 was deployed through Supabase MCP. It supports both legacy hosted Supabase key env vars and newer JSON hosted key env vars, and falls back to Open-Meteo when `OPENWEATHER_API_KEY` is absent.
- 2026-05-18 KST: `npm run supabase:smoke` passed with sanitized output. It proved tester auth, profile read, `weatherCurrent: true`, invalid weather denial HTTP 401, unauthenticated weather denial HTTP 401, and cross-user profile/feedback read denial.
- 2026-05-18 KST: `PWS_SMOKE_WRITE_FEEDBACK=1 npm run supabase:smoke` passed with sanitized output. It inserted one feedback row for `2026-05-18` / `evening`, then deleted it.
- 2026-05-18 KST: sanitized direct backend smoke passed for profile seed/upsert, primary profile read, cross-user profile/feedback read denial, feedback insert, and feedback cleanup.
- 2026-05-18 KST: disposable account deletion smoke passed for `smoke_delete_01@test.pws`; the account was deleted through `delete_own_account`, and post-delete sign-in returned HTTP 400. Recreate a new disposable tester before rerunning deletion smoke.
- 2026-05-24 KST: `npm run supabase:smoke` passed again after network approval. The run proved authenticated profile/weather read, invalid/unauthenticated weather denial as HTTP 401, current/history/count feedback reads, and cross-user profile/feedback read denial. Feedback write and account deletion were intentionally disabled for this run.

## Sanitization
- Do not include live credential values, password values, authorization header contents, private URLs with secrets, or raw backend internals in this checklist.
