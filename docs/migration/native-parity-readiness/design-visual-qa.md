# Design Visual QA: iOS Native Parity Slice

Date: 2026-05-06

Status: strict-copy-applied-with-2026-05-24-polish-visual-pass
Evidence status: `pass`

## 2026-05-24 Polish Closure

Verdict: UI/UX polish remains release-candidate acceptable after a designer subagent audit and fresh emulator/simulator checks.

- Closed the designer audit's highest-impact visual gaps:
  - Android selected feedback/outfit chips now use the blue action treatment instead of the previous dark selected pill.
  - Android and iOS History calendars now align days to real weekdays; May 1, 2026 renders under Friday/`금`.
  - Android bottom tabs now use a flatter white bar with a top hairline and tighter tab height instead of the heavier rounded block.
  - Android long tabbed/strict screens now keep more bottom breathing room so lower History content is not visually trapped behind the tab bar.
  - Android `저녁 알림` fallback defaults to off for missing profile data; live profiles still display their stored notification state.
- Kept live/native truth where strict Figma fixture values would be misleading: live tester names, live weather, live feedback dates, and remote notification values may differ from the static Figma frame.
- Verification passed:
  - `git diff --check`
  - `npm run native:android:test`
  - `npm run native:android:debug`
  - `npm run native:ios:build`
  - XcodeBuildMCP `build_run_sim` on iPhone 17 iOS 26.5 with bundle id `woos.owndo`
- Fresh polish screenshots:
  - Android authenticated Home: `docs/migration/native-parity-readiness/android-emulator-ui-polish-auth-home-2.png`
  - Android Feedback selected chips: `docs/migration/native-parity-readiness/android-emulator-ui-polish-feedback.png`
  - Android History top: `docs/migration/native-parity-readiness/android-emulator-ui-polish-history-top.png`
  - Android History calendar: `docs/migration/native-parity-readiness/android-emulator-ui-polish-history-calendar.png`
  - Android History lower: `docs/migration/native-parity-readiness/android-emulator-ui-polish-history-lower.png`
  - Android Settings: `docs/migration/native-parity-readiness/android-emulator-ui-polish-settings.png`
  - iOS History top: `docs/migration/native-parity-readiness/ios-simulator-26-5-ui-polish-history-top.jpg`
  - iOS History calendar: `docs/migration/native-parity-readiness/ios-simulator-26-5-ui-polish-history-calendar.jpg`
  - iOS History lower: `docs/migration/native-parity-readiness/ios-simulator-26-5-ui-polish-history-lower.jpg`

## 2026-05-24 RC Recheck

Verdict: UI implementation is release-candidate acceptable against the agreed Figma direction; final store signoff still needs accessibility extremes, signed-artifact proof, and privacy/store disclosure closure.

- Reconfirmed Figma MCP source `Temp_app_DesignSystem` / `PWS_STRICT_COPY_ANDROID_2026-05-03` with Home `94:8`, Feedback `94:174`, History `94:347`, Settings `94:625`, and WeatherDetail `94:863`.
- Rechecked local Figma exports against Android strict-copy simulator captures and iOS strict-copy simulator captures. Home, Feedback, History, Settings, and WeatherDetail first-step structure still match the intended stone canvas, white card system, blue active controls, Korean hierarchy, and bottom-tab shell.
- Current iOS RC build/test via XcodeBuildMCP succeeded on iPhone 17 iOS 26.5 with bundle id `woos.owndo`; screenshots were captured for authenticated Home, Feedback, History, Settings, restored Home, and safe-failure autologin state.
- Current Android RC debug build installed on AVD `Testing`; authenticated Home, Feedback, Settings, and dynamic History screenshots were captured after the History screen was changed from static April sample data to current feedback-driven May calendar/chart/records.
- Visual verdict artifact: `.omx/state/native-ui-performance-rc/ralph-progress.json` with score `94`, verdict `pass`, and release-gate follow-ups.

## Scope

Reviewed and updated the native preview surfaces against the actual Figma strict-copy source, not only `DESIGN.md`.

Strict Figma source:

- File: `Temp_app_DesignSystem`
- File key: `ILrTGTBxCs8IxI5Pll8v8y`
- Page: `PWS_STRICT_COPY_ANDROID_2026-05-03`
- Nodes: Home `94:8`, Feedback `94:174`, History `94:347`, Settings `94:625`, WeatherDetail `94:863`

## Implemented Visual Rules

- Stone app canvas: `#FAFAF9` equivalent in native tokens.
- White and stone surfaces: primary cards use white, secondary fills use `#F5F5F4` / `#FAFAF9`.
- Strict action gradient: selected tabs, CTAs, selected chips, and action badges use `#00A6F4 -> #155DFC`.
- Quiet grouped sections: cards use 16pt/24pt radius, hairline borders, and restrained shadows matching the strict-copy frames.
- Korean hierarchy: screen titles and section headers use short product-like Korean copy.
- Screen coverage: Home, Feedback, History, Settings, and WeatherDetail are now represented in both Android Compose and iOS SwiftUI using strict-copy content order and visual hierarchy.

## Build Evidence

- `npm test`: passed on 2026-05-06 after strict-copy reapplication.
- `android/gradlew -p apps/android-native :app:testDebugUnitTest :app:assembleDebug`: passed on 2026-05-06.
- `android/gradlew -p apps/android-native :app:assembleRelease`: passed on 2026-05-06.
- `xcodebuild build -project apps/ios-native/PWSNativePreview.xcodeproj -scheme PWSNativePreview -destination generic/platform=iOS Simulator -derivedDataPath apps/ios-native/.build/DerivedData CODE_SIGNING_ALLOWED=NO`: pass in the structured native readiness artifact.
- `xcodebuild build-for-testing -project apps/ios-native/PWSNativePreview.xcodeproj -scheme PWSNativePreview -destination generic/platform=iOS Simulator -derivedDataPath apps/ios-native/.build/DerivedData CODE_SIGNING_ALLOWED=NO`: currently blocked by simulator destination mismatch.

## Screenshot Evidence

Prior screenshot evidence exists for the iOS native lane from an iPhone 17 simulator through XcodeBuildMCP using `PWS_UI_QA_AUTO_LOGIN=1` for local parity navigation. In the current Codex App surface, runtime capture is blocked by CoreSimulatorService device-set initialization failure; generic simulator build and test-bundle build remain the current executable gates.

Current Android QA-signed release screenshot evidence exists for the unauthenticated login shell: `docs/migration/native-parity-readiness/android-release-qa-signed-login.png`. It proves release-build installability and first-screen rendering on AVD `Testing`, but it does not replace authenticated flow screenshots or iOS runtime capture.

Current iOS simulator screenshot evidence exists for the unauthenticated login shell: `docs/migration/native-parity-readiness/ios-simulator-login-shell.jpg`. It proves the built simulator app can install, launch, and render the first screen on iPhone 17 iOS 26.4, but it does not replace authenticated flow screenshots or repeatable release-gate runtime capture.

Current 2026-05-24 RC build/run evidence:

- iOS login shell after `build_run_sim`: `docs/migration/native-parity-readiness/ios-simulator-26-5-ui-performance-rc-home.jpg`
- iOS QA autologin/error-resilience state after env relaunch: `docs/migration/native-parity-readiness/ios-simulator-26-5-ui-performance-rc-autologin.jpg`
- iOS authenticated Home: `docs/migration/native-parity-readiness/ios-simulator-26-5-ui-performance-rc-auth-home.jpg`
- iOS Feedback: `docs/migration/native-parity-readiness/ios-simulator-26-5-ui-performance-rc-feedback.jpg`
- iOS History: `docs/migration/native-parity-readiness/ios-simulator-26-5-ui-performance-rc-history.jpg`
- iOS Settings: `docs/migration/native-parity-readiness/ios-simulator-26-5-ui-performance-rc-settings.jpg`
- Android authenticated Home: `docs/migration/native-parity-readiness/android-emulator-ui-performance-rc-auth-home.png`
- Android Feedback: `docs/migration/native-parity-readiness/android-emulator-ui-performance-rc-feedback.png`
- Android Settings: `docs/migration/native-parity-readiness/android-emulator-ui-performance-rc-settings.png`
- Android dynamic History top: `docs/migration/native-parity-readiness/android-emulator-ui-performance-rc-history-dynamic.png`
- Android dynamic History lower: `docs/migration/native-parity-readiness/android-emulator-ui-performance-rc-history-dynamic-lower.png`
- Android polish authenticated Home: `docs/migration/native-parity-readiness/android-emulator-ui-polish-auth-home-2.png`
- Android polish Feedback: `docs/migration/native-parity-readiness/android-emulator-ui-polish-feedback.png`
- Android polish History calendar/lower: `docs/migration/native-parity-readiness/android-emulator-ui-polish-history-calendar.png`, `docs/migration/native-parity-readiness/android-emulator-ui-polish-history-lower.png`
- iOS polish History calendar/lower: `docs/migration/native-parity-readiness/ios-simulator-26-5-ui-polish-history-calendar.jpg`, `docs/migration/native-parity-readiness/ios-simulator-26-5-ui-polish-history-lower.jpg`

Captured Figma references:

- Home: `apps/ios-native/qa/screenshots/figma/home.png`
- Feedback: `apps/ios-native/qa/screenshots/figma/feedback.png`
- History: `apps/ios-native/qa/screenshots/figma/history.png`
- Settings: `apps/ios-native/qa/screenshots/figma/settings.png`
- WeatherDetail: `apps/ios-native/qa/screenshots/figma/weather-detail.png`

Captured simulator evidence:

- Home top: `apps/ios-native/qa/screenshots/simulator/home-top-iter2.jpg`
- Home lower recommendations/CTA: `apps/ios-native/qa/screenshots/simulator/home-mid-before-weather.jpg`
- Feedback top: `apps/ios-native/qa/screenshots/simulator/feedback-top-iter2.jpg`
- History top: `apps/ios-native/qa/screenshots/simulator/history-top-iter2.jpg`
- Settings top: `apps/ios-native/qa/screenshots/simulator/settings-top-iter2.jpg`
- WeatherDetail top: `apps/ios-native/qa/screenshots/simulator/weather-detail-top-iter2.jpg`
- Android Home top: `apps/ios-native/qa/screenshots/simulator/android-home-top-iter5.png`
- Android Home lower recommendations/CTA: `apps/ios-native/qa/screenshots/simulator/android-home-lower-iter5.png`
- Android Feedback top: `apps/ios-native/qa/screenshots/simulator/android-feedback-top-iter5.png`
- Android History top: `apps/ios-native/qa/screenshots/simulator/android-history-top-iter6.png`
- Android Settings top: `apps/ios-native/qa/screenshots/simulator/android-settings-top-iter5.png`
- Android WeatherDetail top: `apps/ios-native/qa/screenshots/simulator/android-weather-detail-top-iter7.png`
- Android 393px normalized set: `apps/ios-native/qa/screenshots/simulator/android-*-393.png`
- iOS flow QA top/scroll set: `apps/ios-native/qa/screenshots/simulator/ios-*-flowqa1.jpg`
- iOS WeatherDetail flow QA after visible CTA tap: `apps/ios-native/qa/screenshots/simulator/ios-weather-detail-*-flowqa2.jpg`
- Android flow QA top/scroll set: `apps/ios-native/qa/screenshots/simulator/android-*-flowqa2.png`
- iOS Feedback polish: `apps/ios-native/qa/screenshots/simulator/ios-feedback-chips-polish1.jpg`, `apps/ios-native/qa/screenshots/simulator/ios-feedback-chip-tap-polish1.jpg`, `apps/ios-native/qa/screenshots/simulator/ios-feedback-save-polish2.jpg`
- Android Feedback polish: `apps/ios-native/qa/screenshots/simulator/android-feedback-polish2.png`, `apps/ios-native/qa/screenshots/simulator/android-feedback-chip-tap-polish2.png`, `apps/ios-native/qa/screenshots/simulator/android-feedback-save-polish2.png`
- iOS small-width Feedback stitch: `apps/ios-native/qa/screenshots/simulator/ios-17e-feedback-stitched-polish3.jpg`
- Android small-width Feedback stitch: `apps/ios-native/qa/screenshots/simulator/android-small-feedback-stitched-polish3.png`

## Accepted Deviations

- Runtime data is still partially static/local where the strict-copy frames themselves use deterministic demo values; Android History now uses actual feedback state for count, chart, calendar, recent record, and outfit analysis.
- Icons use platform-native vector symbols where the Figma MCP payload references icon assets; emoji are not used for core UI.
- The WeatherDetail strict-copy frame represents the first region-selection step. Later 기간/확인 steps still need their own native strict-copy frames before full flow parity.
- Android uses native text/icon approximations for a few Figma vector icons, but all five strict-copy surfaces now render the intended section order, demo copy, gradients, card system, and tab shell in emulator screenshots.
- Feedback save CTA is now represented as the Figma white action card with trailing arrow on both native runtimes; earlier blue full-width save buttons were removed from this strict-copy surface.
- Feedback chips are width-aware on Android so long Korean labels such as `강한 바람` wrap to a new chip position instead of clipping on small screens.
- Common button/chip controls now include native pressed-state feedback: iOS scale/opacity response and Android interaction-source ripple/scale response.
- Feedback functional state is now connected on both runtimes. Android saves the selected `FeedbackInputNative` instead of a default payload, and iOS routes saved feedback through `InMemoryFeedbackRepository` so History reflects saved count, dominant slot, and selected outfit.

## Functional QA Evidence

Functional QA was run after the visual polish pass to verify that strict-copy controls are not just static UI.

- iOS `test_sim` on iPhone 17e: 17 passed, 0 failed as prior evidence; current runtime re-execution is blocked by CoreSimulatorService in this surface.
- Android `:app:testDebugUnitTest`: passed.
- iOS simulator interaction: bottom tab to Feedback, `아우터 가디건` accordion expand, `코트` option select, `기록 저장하기`, then History state reflection.
- Android emulator interaction: bottom tab to Feedback, outfit accordion expand/select, save action, and History navigation through `adb` taps plus UI hierarchy dumps.
- iOS log capture for `com.wxxtae.pws.nativepreview.ios`: no app crash log emitted during the interaction pass. The only returned warning was a CoreSimulator accessibility duplicate-class warning from the simulator runtime.
- Android app PID log scan: no app `FATAL EXCEPTION`, ANR, or crash lines. Remaining warnings were emulator/HWUI/runtime-reflection noise.
- Android post-reset `gfxinfo` interaction slice: 75 frames, 8 janky frames, p50 21ms, p90 34ms. Treat as a debug-emulator baseline; release/physical-device profiling remains the next performance check.

New simulator capture:

- iOS History after saved selected feedback: `apps/ios-native/qa/screenshots/simulator/ios-history-functional-qa1.jpg`

## Residual Visual Risks

- iPhone SE-size simulator is not available in the current local simulator set; the small-width iOS pass used iPhone 17e at 390pt width. An installed SE simulator runtime remains useful for one more matrix pass.
- Dynamic Type at accessibility sizes may require row wrapping adjustments after accessibility capture.
- The current screenshots are section-level evidence, because the strict-copy frames are long scroll canvases while the simulator captures one viewport at a time. Full stitched-scroll comparison remains the next visual QA enhancement.
- XcodeBuildMCP accessibility label taps can be stale after scrolling; WeatherDetail iOS navigation is therefore verified from a fresh UI snapshot plus a visible CTA coordinate tap.
