# Privacy And Store Checklist

Status: checklist-created; evidence incomplete
Evidence status: `blocked`
Date: 2026-05-17 KST

## Scope

This checklist tracks first-release privacy and store-disclosure evidence for the Android and iOS native apps. It is not a legal approval and does not replace live runtime evidence.

## Required Before First Release

- Location data: document why configured/default location is used, what precision is sent to weather services, and denial behavior.
- Account data: prove sign-in, sign-out, session restoration, secure local cleanup, and account deletion with sanitized runtime evidence.
- Feedback data: document comfort feedback, outfit selections, history storage, and deletion behavior.
- Diagnostics/logs: prove runtime logs do not include live credential values, password values, session material, or private backend internals.
- Support path: document a user-visible support/contact path for account and data requests.
- Store disclosure inputs: prepare Android Data Safety and iOS privacy answers for location, account, diagnostics, and user feedback data.

## Current Status

- Account deletion client wiring exists on Android and iOS, but live deletion proof is blocked until a disposable tester account is available.
- Android native no longer declares `ACCESS_COARSE_LOCATION` or `ACCESS_FINE_LOCATION`; `npm run native:android:verify` passed on 2026-05-17 16:25 KST, and the merged release manifest lists only `INTERNET`, `VIBRATE`, and the AndroidX dynamic receiver permission. The current native app uses configured/default coordinates for weather rather than runtime device location.
- iOS native runtime config is environment-driven for local builds; installed-app smoke still needs a documented safe config injection path.
- Runtime log and screenshot evidence is incomplete for signed Android and concrete iOS simulator/device runs.
- Store disclosure answers are not final because live backend smoke, signed runtime logs, screenshots, and account-deletion evidence are not fully proven.
- Store disclosure inputs are now drafted in `docs/migration/native-parity-readiness/privacy-store-disclosure-matrix.md`. The matrix narrows the remaining blocker to live proof, final support/privacy URLs, and signed/store identity evidence.

## Evidence Required

- Sanitized Android signed release runtime log and screenshots.
- Sanitized iOS simulator/device runtime log and screenshots.
- Live backend smoke output for auth, profile, weather, feedback/history, ownership isolation, and account deletion.
- Final disclosure notes for Android Data Safety and iOS privacy nutrition labels.
- Support/contact copy and privacy policy/account deletion links verified in-app.

## Location Disclosure Decision

- Android native release manifest: no coarse/fine device-location permission after the 2026-05-17 permission removal.
- iOS native `Info.plist`: no `NSLocation*UsageDescription` key and no CoreLocation usage found in the native source scan.
- Weather requests still send configured/default latitude and longitude to the Supabase weather function; this must be disclosed as approximate configured weather location data, not as device GPS collection.

## Disclosure Matrix

Use `docs/migration/native-parity-readiness/privacy-store-disclosure-matrix.md` as the current engineering draft for Android Data Safety and iOS privacy nutrition label inputs. It currently marks account, configured weather location, feedback, support feedback, diagnostics, and account deletion data surfaces, with the exact live evidence still blocked by credentials/signing/runtime constraints.

## Decision

First production release remains blocked until this checklist is converted from checklist-level status to evidence-backed pass status in the release evidence manifest.
