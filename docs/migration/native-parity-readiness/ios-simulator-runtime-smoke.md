# iOS Simulator Runtime Smoke

Date: 2026-05-18 KST
Status: simulator login-shell, fresh authenticated login, relaunch restore, live weather, feedback save/upsert, history, sign-out, and disposable account deletion runtime smoke passed on iOS 26.5.
Evidence status: `partial-pass`

## Scope

This artifact records the current iOS simulator runtime progress for the native preview app. It proves the built simulator `.app` can be installed and launched on an iPhone 17 simulator, that the unauthenticated login shell renders with screenshot and accessibility hierarchy, and that the live Supabase tester login can enter the authenticated home shell with live weather data.

It does not prove production signing or App Store/TestFlight distribution readiness.

## Build And Runtime Evidence

- `xcodebuild -downloadPlatform iOS`: pass on 2026-05-18 KST, installing iOS 26.5 Simulator (23F77).
- `npm run native:ios:verify`: pass on 2026-05-18 KST, ending with `TEST BUILD SUCCEEDED`.
- `npm run native:readiness`: pass on 2026-05-18 KST; typecheck, JS tests, Android native build/test, and iOS build/build-for-testing all passed.
- XcodeBuildMCP simulator list: iPhone 17 `7B03486C-3F75-40A9-B3B5-8EA39A939451`, iOS 26.5, available.
- XcodeBuildMCP `build_run_sim`: pass for iPhone 17 iOS 26.5, bundle id `com.wxxtae.pws.nativepreview.ios`, process `71346`.
- XcodeBuildMCP `screenshot`: pass, captured `368 x 800` JPEG.
- XcodeBuildMCP `build_sim`: pass after adding iOS Keychain entitlements, with simulator `PWSNativePreview.app-Simulated.xcent` containing `application-identifier` and `keychain-access-groups`.
- XcodeBuildMCP `install_app_sim`: pass for the entitlements-updated simulator app.
- `xcrun simctl launch` with public runtime config from `.env`: pass without printing secret values.
- XcodeBuildMCP `tap`/`type_text` UI automation: pass for tester ID entry and login button activation.
- Authenticated login result: pass. The UI advanced from login to authenticated home and kept token/password values off screen.
- Fresh authenticated weather result: pass after the `weather-onecall` version 3 deployment. XcodeBuildMCP logged out the restored session, entered `smoke_primary`, signed in again, and the home screen rendered live weather values (`24°`, `흐림`, `습도 45%`, `바람 1.1m/s`) without showing token or password values.
- Relaunch restore result: pass. XcodeBuildMCP stopped and relaunched the app on the same simulator with public runtime config, and the app restored the saved Supabase session directly to the authenticated home screen with live weather values still visible.
- Sign-out result: pass. XcodeBuildMCP opened settings, activated `로그아웃`, and the app returned to the tester login shell without displaying token/password values.
- Feedback save/upsert result: pass. Re-saving the same day/slot initially exposed a duplicate-insert failure; the iOS remote feedback client now sends a Supabase/PostgREST upsert (`on_conflict=user_id,feedback_date,feedback_slot` with merge-duplicates), and the rebuilt app saved the record successfully with the restored `smoke_primary` display name.
- History result: pass. XcodeBuildMCP opened `히스토리` after the feedback save and the screen rendered one accumulated record, the 2026-05-18 entry, and the stored clothing/feel summary.
- Disposable account deletion result: pass. After the user recreated `smoke_delete_02@test.pws`, XcodeBuildMCP logged out from `smoke_primary`, signed in as `smoke_delete_02`, verified the settings profile label, activated `계정 삭제`, confirmed `삭제`, and the app returned to the login shell. A direct post-delete sign-in check for `smoke_delete_02@test.pws` returned HTTP 400 and no session material.
- XcodeBuildMCP `test_sim`: pass on 2026-05-18 KST after the restored-session email and feedback upsert fixes; 38 tests passed, 0 failed.

Historical login-shell evidence from 2026-05-17 KST:

- XcodeBuildMCP simulator list: iPhone 17 `C721B497-AB6E-4C1F-B5B5-3166CDD0E4DD`, iOS 26.4, available.
- XcodeBuildMCP `boot_sim`: pass for iPhone 17.
- XcodeBuildMCP `install_app_sim`: pass for `apps/ios-native/.build/DerivedData/Build/Products/Debug-iphonesimulator/PWSNativePreview.app`.
- XcodeBuildMCP `launch_app_sim`: pass for bundle id `com.wxxtae.pws.nativepreview.ios`, process `36956`.
- XcodeBuildMCP `screenshot`: pass, captured `368 x 800` JPEG.
- XcodeBuildMCP `snapshot_ui`: pass.

## Evidence Files

- Screenshot: `docs/migration/native-parity-readiness/ios-simulator-login-shell.jpg`.
- Filtered runtime log: `docs/migration/native-parity-readiness/ios-simulator-login-shell-runtime-log.txt`.
- Filtered OS log: `docs/migration/native-parity-readiness/ios-simulator-login-shell-oslog.txt`.
- iOS 26.5 screenshot: `docs/migration/native-parity-readiness/ios-simulator-26-5-login-shell.jpg`.
- iOS 26.5 filtered runtime log: `docs/migration/native-parity-readiness/ios-simulator-26-5-login-shell-runtime-log.txt`.
- iOS 26.5 filtered OS log: `docs/migration/native-parity-readiness/ios-simulator-26-5-login-shell-oslog.txt`.
- iOS 26.5 authenticated home/weather-blocked screenshot: `docs/migration/native-parity-readiness/ios-simulator-26-5-authenticated-weather-blocked.jpg`.
- iOS 26.5 authenticated home/weather-success screenshot: `docs/migration/native-parity-readiness/ios-simulator-26-5-authenticated-weather-success.jpg`.
- iOS 26.5 relaunch/weather-restore screenshot: `docs/migration/native-parity-readiness/ios-simulator-26-5-relaunch-weather-restore.jpg`.
- iOS 26.5 feedback upsert success screenshot: `docs/migration/native-parity-readiness/ios-simulator-26-5-feedback-upsert-success.jpg`.
- iOS 26.5 history success screenshot: `docs/migration/native-parity-readiness/ios-simulator-26-5-history-success.jpg`.
- iOS 26.5 disposable account deletion returned-login screenshot: `docs/migration/native-parity-readiness/ios-simulator-26-5-account-deletion-returned-login.jpg`.

## Visible UI And Accessibility Snapshot

The captured accessibility hierarchy shows:

- App label: `PWS Native`.
- Heading: `날씨 체감 기록`.
- Static text: `오늘의 날씨, 나만의 체감으로 기록하세요`.
- Tester login text field: `테스터 아이디`, with help text for registered tester id input.
- Disabled button: `테스터로 시작하기`, with help text for tester-account login.
- Privacy copy stating that this preview does not show tokens or passwords on screen.
- Footer: `PWS Native Preview`.

## Sanitization And Log Notes

- Filtered app runtime logs did not expose access tokens, refresh tokens, bearer token values, privileged backend keys, or password values.
- The runtime log includes a CoreSimulator accessibility duplicate-class warning from WebCore/WebKit. It is a simulator/runtime warning, not an observed app crash.
- The filtered OS log only records the subsystem filter line for `com.wxxtae.pws.nativepreview.ios`.

## Remaining Blockers

- Capture authenticated flow screenshots plus VoiceOver/Dynamic Type/safe-area evidence.
