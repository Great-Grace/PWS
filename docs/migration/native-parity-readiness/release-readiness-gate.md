# Native Release Readiness Gate

Status: active-no-ship-gate
Evidence status: `blocked`

## Scope

This gate is separate from `npm run native:readiness`. The native readiness script proves build/test-bundle readiness. `release:readiness` is the first-release signoff surface and must stay blocked until runtime, backend, security, dependency, signing, and privacy evidence exists.

## No-Ship Criteria

Do not approve a first Android+iOS release if any of the following are true:

- Android or iOS lacks runtime smoke evidence for startup, login, onboarding/profile, home/weather, feedback, history, settings toggles, sign-out, and relaunch.
- Live Supabase evidence is missing for auth, profile, weather Edge Function, feedback/history, RLS isolation, and account deletion boundaries.
- A release candidate uses static/demo data or local-only state for production auth, weather, feedback, or history.
- Android stores real session material in plaintext or cannot prove encrypted release session behavior.
- iOS cannot restore, refresh, and clear a Keychain-backed Supabase session.
- Crash/log review is missing or logs contain token-bearing values.
- Signed artifact evidence is missing for the target distribution path.
- Dependency audit, native config drift, privacy, or SBOM/notice review is unresolved.

## Required Command Gate

Run these after P0/P1 fixes and before final release signoff:

- `npm audit --omit=dev`
- `npx expo-doctor`
- `npx expo install --check`
- `npm run typecheck`
- `npm test`
- `npm run native:android:verify`
- `npm run native:ios:verify`
- `npm run release:sbom`
- `npm run supabase:smoke`

Additional platform gates:

- Android release artifact: `npm run android:release` or the approved release build command with upload-key evidence.
- iOS runtime test: `xcodebuild test` or XcodeBuildMCP simulator/device lane when CoreSimulator/device access is healthy.
- Android/iOS runtime smoke with sanitized logs.
- Live Supabase read/RLS smoke: `npm run supabase:smoke`; account deletion proof remains a separate controlled disposable-account step unless the smoke harness is explicitly extended for that case.

## Required Evidence

- Structured evidence manifest at `docs/migration/native-parity-readiness/release-evidence-manifest.json` with `status: pass`, release-candidate commit matching current `HEAD`, a clean worktree for release pass, fresh command completion timestamps no older than 7 days, sanitized artifact paths, and per-command `pass` status.
- Sanitized Android `adb logcat` for startup, full smoke, sign-out, and relaunch.
- Sanitized iOS simulator/device logs for startup, full smoke, sign-out, and relaunch.
- Screenshot set for Android and iOS standard/small viewport visual QA.
- Accessibility notes for TalkBack/VoiceOver order, Dynamic Type, keyboard paths, safe areas, and tap targets.
- Live Supabase smoke notes with no live credential values, password values, auth header values, privileged backend keys, or private backend internals.
- Privacy/store checklist artifact: `docs/migration/native-parity-readiness/privacy-store-checklist.md`.
- SBOM/license evidence: `docs/migration/native-parity-readiness/sbom-npm.json` with `status: pass`, plus native dependency/license review evidence.
- Signed artifact metadata or a documented account/provisioning blocker.

## Release Script

Use `npm run release:readiness` as the local no-ship harness. It validates that this gate exists, requires the structured evidence manifest, lists the required command gate, checks that the manifest commit matches current `HEAD`, rejects a `pass` manifest on a dirty worktree, rejects stale command evidence, checks SBOM status, checks required evidence categories, requires passing category artifacts to exist and be listed as sanitized, and remains blocked while the first-release plan declares `Status: not ready` or while any manifest command/category is missing, stale, or not passing.
