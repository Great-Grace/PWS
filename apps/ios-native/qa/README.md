# iOS Native Visual QA

Date: 2026-05-06

## Method

The iOS native app is now verified through simulator screenshots, not compile-only checks.

- Simulator: iPhone 17, `C721B497-AB6E-4C1F-B5B5-3166CDD0E4DD`
- Bundle: `woos.owndo`
- Launch mode: `PWS_UI_QA_AUTO_LOGIN=1`
- Figma file: `Temp_app_DesignSystem`
- Figma strict page: `PWS_STRICT_COPY_ANDROID_2026-05-03`

`PWS_UI_QA_AUTO_LOGIN=1` is a local QA shortcut for reaching the strict-copy tab screens. It does not replace production auth.

## Reference Screenshots

| Screen | Figma Node | Reference |
| --- | --- | --- |
| Home | `94:8` | `screenshots/figma/home.png` |
| Feedback | `94:174` | `screenshots/figma/feedback.png` |
| History | `94:347` | `screenshots/figma/history.png` |
| Settings | `94:625` | `screenshots/figma/settings.png` |
| WeatherDetail | `94:863` | `screenshots/figma/weather-detail.png` |

## Simulator Evidence

| Screen | State | Capture |
| --- | --- | --- |
| Home | top, fresh launch | `screenshots/simulator/home-top-iter2.jpg` |
| Home | lower recommendations and CTA | `screenshots/simulator/home-mid-before-weather.jpg` |
| Feedback | top | `screenshots/simulator/feedback-top-iter2.jpg` |
| History | top | `screenshots/simulator/history-top-iter2.jpg` |
| Settings | top after profile-name fix | `screenshots/simulator/settings-top-iter2.jpg` |
| WeatherDetail | top after Home CTA navigation | `screenshots/simulator/weather-detail-top-iter2.jpg` |
| Android Home | top after strict-copy hero fix | `screenshots/simulator/android-home-top-iter5.png` |
| Android Home | lower recommendations and CTA | `screenshots/simulator/android-home-lower-iter5.png` |
| Android Feedback | top after strict-copy form rework | `screenshots/simulator/android-feedback-top-iter5.png` |
| Android History | top after strict-copy chart/calendar rework | `screenshots/simulator/android-history-top-iter6.png` |
| Android Settings | top after strict-copy profile/settings rework | `screenshots/simulator/android-settings-top-iter5.png` |
| Android WeatherDetail | top after Home CTA navigation | `screenshots/simulator/android-weather-detail-top-iter7.png` |
| Android strict-copy set | 393px Figma-width normalized captures | `screenshots/simulator/android-*-393.png` |
| iOS Home | flow QA top and lower scroll | `screenshots/simulator/ios-home-*-flowqa1.jpg` |
| iOS Feedback | flow QA top and lower scroll | `screenshots/simulator/ios-feedback-*-flowqa1.jpg` |
| iOS History | flow QA top and lower scroll | `screenshots/simulator/ios-history-*-flowqa1.jpg` |
| iOS Settings | flow QA top and lower scroll | `screenshots/simulator/ios-settings-*-flowqa1.jpg` |
| iOS WeatherDetail | flow QA after visible Home CTA tap | `screenshots/simulator/ios-weather-detail-*-flowqa2.jpg` |
| Android full tab set | flow QA top and lower scroll | `screenshots/simulator/android-*-flowqa2.png` |
| iOS Feedback | polish pass: no-wrap chips, chip tap reaction, Figma save CTA | `screenshots/simulator/ios-feedback-*-polish1.jpg`, `screenshots/simulator/ios-feedback-save-polish2.jpg` |
| Android Feedback | polish pass: no-wrap chips, chip tap reaction, Figma save CTA | `screenshots/simulator/android-feedback-*-polish2.png` |
| iOS Feedback | small-width iPhone 17e top/bottom stitched QA | `screenshots/simulator/ios-17e-feedback-*-polish3.jpg` |
| Android Feedback | 720x1600 small-width top/bottom stitched QA after FlowRow chip fix | `screenshots/simulator/android-small-feedback-*-polish3*.png` |
| iOS History | functional QA after saving selected feedback input | `screenshots/simulator/ios-history-functional-qa1.jpg` |

## Current Verdict

Visual QA is active and reproducible. Iteration 2 fixes the most visible iOS strict-copy break: the Settings profile card now renders the Figma demo name `지우진` for the parity tester instead of leaking the local tester id `pws_dev`.

Android iterations 5-6 now cover the full strict-copy tab set in emulator QA. Home no longer uses the non-Figma blue hero card, Feedback now follows the time-slot/dropdown/chip form, History renders the red streak card plus weekly line chart and calendar, Settings renders the Figma demo profile/settings structure, and WeatherDetail opens from the Home CTA into the region-selection layout.

The Android strict-copy captures were also normalized to the 393px Figma frame width for visual-verdict review. The current persisted verdict is `pass` at score `90`.

Flow QA was expanded after that verdict. iOS and Android now both have fresh top and scrolled captures for Home, Feedback, History, Settings, and WeatherDetail. iOS WeatherDetail was reverified with the Home CTA visible in the viewport; stale/offscreen label targeting in the simulator automation can report success without changing screens, so flow QA now uses a fresh UI snapshot before coordinate taps.

Polish iteration 2 focused on the Figma Feedback surface. Both runtimes now keep feedback chips and button labels on a single line, chips update selected state on tap, and the final save CTA matches the Figma white card with trailing arrow instead of the earlier blue full-width button. The current persisted verdict is `pass` at score `93`.

Polish iteration 3 added tactile pressed states for common native buttons and feedback chips. It also ran small-width QA: iOS on iPhone 17e and Android with a 720x1600 / 320dpi override. Android initially clipped the `강한 바람` chip in the fixed four-chip row layout; the feedback chip group now uses width-aware wrapping, and the fixed bottom capture shows the full label plus save CTA. The current persisted verdict is `pass` at score `94`.

Functional QA found two interaction issues after visual parity: feedback outfit rows looked like accordions but were static, and Android saved the default feedback payload instead of the selected UI values. Both are fixed. iOS now also routes saved feedback through an in-memory native repository state, so History reflects the saved count and selected outfit. Verified interactions include bottom-tab pressed states, Feedback accordion expand/collapse, option selection, save banner, and History state reflection.

Fresh verification from this pass:

- iOS `test_sim`: 17 tests passed on iPhone 17e.
- iOS simulator UI: `아우터 가디건` expanded, `코트` selected, save banner showed `pws_dev님의 1번째 체감 데이터`, and History showed `누적 기록 1개` plus `반팔티, 반팔 블라우스&셔츠, 코트, 청바지`.
- Android unit tests: `:app:testDebugUnitTest` passed.
- Android UI: accordion/options/save/history navigation were rechecked through `adb` taps and UI hierarchy dumps.
- Android app PID log scan: no `FATAL EXCEPTION`, ANR, or app crash lines found; remaining warnings were HWUI/emulator/runtime reflection warnings.
- Android post-reset `gfxinfo` interaction slice: 75 rendered frames, 8 janky frames, 50th percentile 21ms, 90th percentile 34ms. This is acceptable for the debug emulator slice but still worth rechecking on a release build or physical device.

Remaining polish risks are tracked in `.omx/state/ios-visual-qa/ralph-progress.json`.
