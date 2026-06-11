# Native Parity Fixtures

Status: baseline fixture manifest created; platform coverage is partial.
Evidence status: `prior-evidence`

## Manifest
- Path: `shared/contracts/parity-fixtures/native-parity-manifest.json`
- Purpose: freeze high-risk behavior before platform-specific UI polish.
- Required domains: PWS date boundary, weather request/cache, prediction/feedback formula, feedback/history counts, tester auth fallback, session clearing, runtime transitions.

## Coverage
- Android is the current native behavior reference for most domain logic.
- iOS now has tester-auth, Keychain-backed session-clearing, weather request/cache, profile request/client, feedback normalization, and history-count contract coverage. Runtime orchestration plus auth/weather/feedback remote adapters are still gaps.
- Historical cross-platform behavior is no longer a workspace source; parity references now live in shared contracts and native tests.

## Sanitization
- Fixture data intentionally contains no live credentials, password values, session values, privileged backend keys, or private backend URLs.
- Auth-related fixtures describe key names and header names only.

## Open Gaps
- Add per-domain JSON fixtures if platform tests start consuming fixtures directly.
- Record any intentional Android/iOS divergence here with product rationale.
