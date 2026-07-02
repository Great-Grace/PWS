# Android QA-Signed Release Runtime Smoke

Date: 2026-05-18 KST
Status: QA-signed release install/login/relaunch smoke passed; first-release signoff still blocked.
Evidence status: `partial-pass`

## Scope

This artifact proves a locally QA-signed Android release APK can be installed on the `Testing` AVD, launched without an app crash, authenticated against Supabase through the email/password login form, and relaunched into the restored authenticated home shell. It includes sanitized screenshots, UI hierarchy, package/signing evidence, and filtered log evidence.

It does not prove production signing, Play upload-key signing, Android feedback/history/account-deletion flows, TalkBack/Dynamic Type-equivalent accessibility evidence, or store privacy approval.

## Artifact

- APK: `apps/android-native/app/build/outputs/apk/release/app-release-qa-signed.apk`
- APK SHA-256: `aa3fc08857fb85657d298bff35a3ca9fbe64b0fa6244c66584c9d2930f2935b5`
- Signer: local Android debug keystore used only for QA installability proof.
- Signer certificate SHA-256: `6d8f51ec6b30f84ae7677fd139c48aabafa3d3de52197d93cfd87b635b40d964`
- Verified schemes: APK Signature Scheme v2 and v3.

## Commands

- `apksigner sign --ks ~/.android/debug.keystore --out apps/android-native/app/build/outputs/apk/release/app-release-qa-signed.apk apps/android-native/app/build/outputs/apk/release/app-release-unsigned.apk`: pass.
- `apksigner verify --verbose --print-certs apps/android-native/app/build/outputs/apk/release/app-release-qa-signed.apk`: pass.
- `shasum -a 256 apps/android-native/app/build/outputs/apk/release/app-release-qa-signed.apk`: pass.
- `adb install -r apps/android-native/app/build/outputs/apk/release/app-release-qa-signed.apk`: `Success`.
- `adb shell pm clear com.wxxtae.pws.nativepreview && adb shell am start -W -n com.wxxtae.pws.nativepreview/.MainActivity`: `Status: ok`, `LaunchState: COLD`.
- `adb shell input tap/text`: live tester email/password login passed and rendered authenticated home.
- `adb shell am force-stop com.wxxtae.pws.nativepreview && adb shell am start -W -n com.wxxtae.pws.nativepreview/.MainActivity`: relaunched into restored authenticated home after moving session restore off the main thread.
- `adb shell pidof com.wxxtae.pws.nativepreview`: returned process `7491`.
- `adb shell dumpsys activity activities`: `topResumedActivity=ActivityRecord{... com.wxxtae.pws.nativepreview/.MainActivity ...}`.
- `adb shell pm path com.wxxtae.pws.nativepreview`: installed base APK path returned.
- `adb shell dumpsys package com.wxxtae.pws.nativepreview`: package installed with `versionName=0.1.0-native-preview`, `targetSdk=36`, `apkSigningVersion=4`, and requested permissions limited to `INTERNET`, app dynamic receiver signature permission, and `VIBRATE`.
- `adb exec-out screencap -p`: produced the login screenshot artifact.
- `adb shell uiautomator dump` plus `adb pull`: produced the UI hierarchy artifact.
- `adb logcat -c` before final relaunch, then `adb logcat -d` filtered for the package, crash markers, ANR, and token/password-bearing keywords: no package `FATAL EXCEPTION`, no package ANR, and no token/password-bearing app log value observed.

## Evidence Files

- Screenshot: `docs/migration/native-parity-readiness/android-release-qa-signed-login.png` (`1080 x 2424` PNG).
- UI hierarchy: `docs/migration/native-parity-readiness/android-release-qa-signed-window.xml`.
- Filtered logcat: `docs/migration/native-parity-readiness/android-release-qa-signed-logcat.txt`.
- Authenticated home screenshot: `docs/migration/native-parity-readiness/android-release-qa-signed-authenticated-home.png` (`1080 x 2424` PNG).
- Authenticated home UI hierarchy: `docs/migration/native-parity-readiness/android-release-qa-signed-authenticated-home-window.xml`.
- Relaunch restore screenshot: `docs/migration/native-parity-readiness/android-release-qa-signed-relaunch-restore.png` (`1080 x 2424` PNG).
- Relaunch restore UI hierarchy: `docs/migration/native-parity-readiness/android-release-qa-signed-relaunch-restore-window.xml`.
- Authenticated filtered logcat: `docs/migration/native-parity-readiness/android-release-qa-signed-authenticated-logcat.txt`.

## Findings

- The QA-signed release APK installs and cold-launches to a resumed `MainActivity`.
- The rendered screen is the login surface with tester entry, email field, password field, and disabled email-login CTA until credentials are entered.
- The release email/password form can authenticate against the live Supabase project using a seeded tester account.
- Android persisted the Supabase session in encrypted storage, then restored the authenticated home shell after a force-stop/relaunch cycle.
- A release-only crash was found and fixed during this pass: restore originally fetched the profile on the main thread and crashed with `NetworkOnMainThreadException`; restore now runs through the background runtime path.
- The password field is marked as a password node in the UI hierarchy.
- The release manifest evidence confirms native location permissions are absent from the installed package.
- The filtered logcat artifact does not contain session-token, bearer-token, privileged backend key, or password values.

## Remaining Blockers

- Production signing is not proven. This APK is signed with the local debug keystore only so the emulator can install a release build.
- Android feedback/history/sign-out/account-deletion flows still need fresh QA-signed runtime screenshots.
- This artifact does not replace iOS runtime evidence, visual parity capture for authenticated flows, TalkBack/VoiceOver audit, store privacy evidence, or final signed artifact metadata.
