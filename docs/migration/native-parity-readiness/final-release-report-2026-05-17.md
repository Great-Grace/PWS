# Android+iOS First Release Report - 2026-05-17 KST

Status: not ready for first production release.
Evidence status: `blocked`

## What Changed

- Added a no-ship release gate with `npm run release:readiness`.
- Added a sanitized Supabase live smoke harness with `npm run supabase:smoke`, including read checks, unauthenticated weather denial, an opt-in feedback write/delete path, and a guarded disposable-account deletion path.
- Android real Supabase session storage now uses an encrypted backing store contract and release wiring.
- iOS login now uses a URLSession-backed Supabase auth client, persists/restores Keychain session material, and clears session state on sign-out.
- iOS Home, Feedback, and History now use typed runtime state backed by URLSession weather and feedback/history clients instead of static/in-memory production paths.
- iOS feedback/history now use the shared 05:00 PWS date boundary, with build-test coverage for the 04:59/05:00 edge.
- iOS History static sample records, static calendar counts, and static analysis copy were replaced with feedback-state-derived UI.
- Native runtime failures now surface as controlled UI errors on Android/iOS, and iOS account deletion now requires explicit destructive confirmation before calling the backend deletion path.
- Added a repeatable npm SBOM generator with `npm run release:sbom`.
- Android native now removes unused coarse/fine location permissions from the release manifest and records a native dependency/license review artifact.

## Fresh Evidence

- `npm run typecheck`: pass.
- `npm test`: pass, including `nativeParityReadiness` and `firstReleaseReadiness`.
- `npm run native:android:verify`: pass for unit, debug APK, and release APK build gates. The Codex App sandbox required escalated access to the existing `~/.gradle` wrapper cache.
- `npm run native:ios:build`: pass against `generic/platform=iOS Simulator`.
- `npm run native:ios:verify`: mixed. A direct run passed once with `TEST BUILD SUCCEEDED`, but the repeatable aggregate `npm run native:readiness` still records the iOS gate as blocked because the release-gate environment cannot resolve `generic/platform=iOS Simulator` while iOS 26.5 simulator runtime is not installed.
- `npx expo install --check`: pass.
- `npm audit --omit=dev`: pass after pinning transitive `postcss` to `8.5.10` with an npm override.
- `npx expo-doctor`: pass after explicitly disabling `appConfigFieldsNotSyncedCheck` for this checked-in native source-of-truth workflow.
- `npm run release:readiness`: correctly blocked because first-release signoff evidence is still incomplete.
- Android debug runtime smoke: partially passed on AVD `Testing`; debug APK install returned `Success`, relaunch returned `Status: ok`, `MainActivity` was top/resumed, process `2351` stayed alive, encrypted prefs were present, and filtered package logcat showed no package fatal/ANR.
- Android release auth masking fix: passed in code and unit/build gates; release runtime no longer opens a local tester session when remote tester auth is unavailable or fails.
- Android release-capable login path: passed in code and unit/build gates; email/password login no longer depends on a bundled tester password, and remote sign-in now keeps the Supabase user id rather than a local tester id. Signed release runtime evidence is still required.
- Android onboarding/profile fail-closed path: passed in code and unit/build gates; profile completion now waits for local profile validation plus Supabase profile upsert before navigating home, and release-like runtime fails if the profile client is missing.
- Android location permission removal: passed in `npm run native:android:verify`; the merged release manifest no longer includes coarse/fine device-location permissions.
- Android QA-signed release login-shell smoke: partially passed on AVD `Testing`; the release APK was locally signed with the Android debug keystore for emulator installability, `apksigner verify` passed with v2/v3 schemes, `adb install -r` returned `Success`, cold launch returned `Status: ok`, `MainActivity` was top/resumed with process `7491`, a 1080x2424 login screenshot and UI hierarchy were captured, installed permissions excluded coarse/fine location, and filtered logcat showed no package fatal/ANR or token-bearing app log values.
- iOS simulator login-shell smoke: partially passed on iPhone 17 iOS 26.4; XcodeBuildMCP booted the simulator, installed the built simulator app, launched bundle id `com.wxxtae.pws.nativepreview.ios`, captured `ios-simulator-login-shell.jpg`, captured the login-shell accessibility hierarchy, and filtered runtime/OS logs without token-bearing values.
- Android remote feedback/history wiring: passed in unit/build gates; release runtime no longer hides Supabase feedback/history failures behind local-only persistence.
- Native account deletion wiring: passed Android build/unit gates and iOS fallback compile; Android/iOS now call `delete_own_account` before clearing local secure session/UI state.
- iOS Keychain persistence hardening: passed fallback Xcode compile; secure session save/clear now propagates storage failures instead of silently ignoring them.
- iOS runtime config injection contract: passed app build; `PWSConfig` documents simulator launch-env injection and tests missing public config failures before network calls.
- Native runtime failure UX: passed Android build/unit gates and iOS fallback compile; Android background runtime work no longer crashes silently on thrown failures, iOS now displays runtime errors, and account deletion on iOS is confirmation-gated.
- `npm run release:sbom`: command pass; generated 703 npm package entries from the lockfile with `status: pass` and `unknownLicenseCount: 0` after reading legacy package license metadata from installed package manifests.
- Native dependency/license review: pass; `docs/migration/native-parity-readiness/native-dependency-license-review.md` documents Android release runtime dependencies and confirms no iOS third-party package manager dependencies are present.
- Privacy/store disclosure matrix: drafted; `docs/migration/native-parity-readiness/privacy-store-disclosure-matrix.md` documents account, configured weather coordinates, feedback, support feedback, diagnostics, and account deletion data surfaces plus platform permission posture.

## Blocking Evidence

- `npm run supabase:smoke`: fail after reaching Supabase Auth; both configured tester accounts returned `invalid_credentials`.
- iOS repeatable test-bundle build and authenticated runtime screenshots remain blocked by the local SDK/runtime mismatch and invalid tester credentials: install an iOS 26.5 simulator runtime or switch to an Xcode toolchain matching the installed iOS 26.4 runtime, then rerun authenticated flow QA.
- Android production-signed release install/relaunch, live login, and signed persistence proof remain uncollected. Android evidence now includes debug shell smoke and QA-signed release login-shell smoke, but the QA-signed APK uses the local debug keystore and does not prove production signing or live authenticated flows.
- Live write-path smoke for feedback insert/history refresh remains uncollected until valid tester credentials and a controlled tester-data mutation plan are available.
- Live account-deletion RPC evidence remains uncollected until valid tester credentials and a controlled disposable tester account are available for the guarded deletion smoke path.
- Privacy/store checklist evidence remains blocked but is more concrete: the location-permission sub-blocker and disclosure-input draft are complete, while final support/privacy links, signing, authenticated runtime logs/screenshots, and live deletion proof remain open.

## No-Ship Decision

Do not ship Android+iOS externally yet. The codebase is significantly closer to release readiness, but production signoff still needs valid live credentials, backend/RLS smoke, runtime device/simulator smoke, privacy/store evidence, and signed artifact evidence.
