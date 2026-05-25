# Privacy And Store Disclosure Matrix

Date: 2026-05-17 KST
Status: disclosure inputs prepared; release proof still blocked.
Evidence status: `blocked`

## Scope

This matrix summarizes the current Android/iOS native app data surfaces for first-release store disclosure preparation. It is an engineering evidence artifact, not legal approval.

## Data Categories

| Category | Collected Or Sent | Purpose | Storage/Transit | Current Evidence | Release Blocker |
| --- | --- | --- | --- | --- | --- |
| Account identifier | Supabase user id, email/profile fields after auth | Login, profile ownership, RLS boundaries, account deletion | Supabase Auth/session, native secure storage, profile table | Android/iOS auth/profile clients and account-deletion clients are wired; unit/build evidence exists | Live tester credentials and disposable deletion tester are required |
| Approximate configured weather location | Latitude/longitude from configured/default weather region | Weather fetch and personalized clothing/comfort context | Sent to Supabase `weather-onecall` Edge Function; cached as weather data | Android native release manifest has no coarse/fine location permissions; iOS native source has no CoreLocation usage string/source path | Store wording must say configured/default weather coordinates, not GPS collection |
| Weather response | Temperature, humidity, wind, UV, weather code/description, hourly/daily forecast | Home/weather detail and recommendation context | Supabase Edge Function response and weather cache | Shared contract, Android/iOS clients, and tests exist | Live valid-auth weather smoke remains blocked |
| Comfort feedback | Slot, perceived temperature/condition, outfit, weather context, feedback date | Personal feedback history and recommendation quality | Supabase `feedback_entries`; native UI state | Android/iOS feedback repositories and history contracts exist | Live feedback write/read/RLS smoke remains blocked |
| Support feedback | User id plus support message body | User support/contact and service quality | Supabase `tester_feedback` path | Contract tests guard empty/oversized support messages | In-app final support/contact path still needs release UX proof |
| Diagnostics/logs | Runtime logs and crash indicators | Stability/security verification | Local QA artifacts only for current evidence | Android QA-signed and iOS login-shell filtered logs show no token-bearing values | Full authenticated logs still missing |
| Account deletion | Authenticated `delete_own_account` RPC | User data deletion | Supabase RPC followed by native session cleanup | Android/iOS clients are wired and guarded | Disposable-account live deletion proof is required |

## Platform Permission Inputs

| Platform | Permission / Privacy Key | Current State | Disclosure Direction |
| --- | --- | --- | --- |
| Android native | `ACCESS_COARSE_LOCATION` / `ACCESS_FINE_LOCATION` | Removed from native release manifest; installed QA-signed package requested only `INTERNET`, app dynamic receiver signature permission, and `VIBRATE` | Do not disclose device GPS collection for native release unless the permission is reintroduced |
| Android native | Internet | Required for Supabase auth/weather/profile/feedback/history/account deletion | Disclose network-backed account, weather, feedback, and support data flows |
| Android native | Vibration | Requested via AndroidX/runtime UI stack | Review whether user-visible haptics are intentional before store submission |
| iOS native | `NSLocation*UsageDescription` | No native Info.plist location usage key and no CoreLocation source usage found | Do not disclose iOS precise device location for native release unless CoreLocation is added |
| iOS native | Encryption export | Expo reference declares `ITSAppUsesNonExemptEncryption=false`; native iOS store/archive evidence is not finalized | Reconfirm for final iOS bundle/signing lane |

## Store Answer Draft

- Location: native apps do not request device location permission. Weather uses configured/default region coordinates sent to the backend weather function.
- Account: app uses email/password or tester auth through Supabase; session material is stored in platform secure storage.
- User content/feedback: app stores comfort feedback, outfit selections, weather context, and history records tied to the authenticated user.
- Diagnostics: current release evidence stores filtered QA logs only; production telemetry/crash reporting is not currently proven as a separate service.
- Deletion: account deletion UI/RPC paths exist on both native platforms, but live deletion proof is blocked until a disposable tester account is available.
- Support: settings/support feedback paths exist in native code, but final privacy/support URLs and store listing copy remain open.

## Remaining Proof Needed

- Live Supabase smoke with valid tester credentials for auth/profile/weather/feedback/history/RLS.
- Disposable-account deletion smoke through `PWS_SMOKE_DELETE_ACCOUNT=1`.
- Production-signed Android artifact and iOS archive/TestFlight or explicit account blocker evidence.
- Authenticated Android/iOS screenshots and filtered logs.
- Final privacy policy URL, support URL/email, and store-form answers reviewed against the exact release identities.
