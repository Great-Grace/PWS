# Native Parity Security Review

Status: mitigations-landed-with-live-followups
Evidence status: `blocked`
Date: 2026-05-24
Scope: Android native Supabase/session/auth/profile/weather surfaces, iOS native Supabase/auth/profile/weather/feedback clients, Supabase RLS/RPC/advisor state, weather Edge Function latency behavior, shared backend contracts, QA artifact hygiene, dependency audit status.

## Summary

- Risk level: MEDIUM for first commercial release readiness.
- Critical findings: 0.
- High findings: 0 unmitigated in release builds; permanent production follow-up remains for signed artifacts and store release process.
- Medium findings: live backend evidence is now collected; Supabase Auth leaked-password protection remains a dashboard-side hardening item.
- Low findings: 2 accepted or monitored.
- Platform source changes landed for Android release fail-closed behavior. iOS has request/session contracts, Keychain-backed session storage, URLSession-backed auth/profile/weather/feedback-history clients, and a 10s native HTTP timeout. Live Supabase smoke now passes; production signoff still needs signed-artifact, accessibility-extreme, privacy/store, and explicit Edge Function deploy evidence.

## 2026-05-24 Addendum

- Supabase MCP security advisor result: one WARN remains, `auth_leaked_password_protection` disabled. Enable it in Supabase Dashboard before store release: https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection
- Supabase MCP performance advisor result: only INFO-level unused-index candidates were reported (`weather_cache_lookup_idx`, `idx_feedback_date`, `idx_anon_pool_zone_bmi`, `idx_anon_pool_temp_feel`). These are monitoring candidates, not an immediate drop recommendation while traffic is low.
- Live SQL verification: RLS is enabled on `anon_feedback_pool`, `feedback_entries`, `notification_log`, `predictions`, `tester_feedback`, `user_anon_map`, `users`, and `weather_cache`.
- Live RPC verification: `public.delete_own_account()` is a SECURITY INVOKER wrapper with empty `search_path`; `private.delete_own_account()` is the SECURITY DEFINER implementation with empty `search_path`.
- Live smoke verification: `npm run supabase:smoke` passed on 2026-05-24 KST after network approval. It proved authenticated profile/weather reads, invalid/unauthenticated weather denial as HTTP 401, feedback history/count reads, and cross-user profile/feedback read denial without printing secrets.
- Load/latency hardening: local `weather-onecall` now bounds provider fetches at 3.5s and returns a usable stale weather cache for up to 6h when the provider path fails. This code passed Deno check but still needs an explicit Supabase Edge Function deployment before it affects production traffic.
- Client timeout hardening: iOS shared URLSession transport now sets a 10s timeout for auth/profile/weather/feedback/account-deletion HTTP clients.
- Maintenance hardening: `pws_security_baseline.sql`, `pws_security_preflight.sql`, and `fix_delete_own_account_search_path.sql` now match the current private-definer/public-wrapper account-deletion architecture, preventing future manual SQL runs from reintroducing a public SECURITY DEFINER RPC.

## Findings

### SEC-01 Android real session material uses encrypted preferences, but runtime proof remains required

- Severity: HIGH
- Category: OWASP A02 Cryptographic Failures / A07 Identification and Authentication Failures
- Status: Mitigated in code; runtime proof required
- Location: `apps/android-native/app/src/main/java/com/wxxtae/pws/nativepreview/AndroidKeyValueStore.kt:10`, `apps/android-native/app/src/main/java/com/wxxtae/pws/nativepreview/domain/NativeSupabaseSession.kt:26`
- Evidence: Android now includes `AndroidEncryptedKeyValueStore` backed by AndroidX Security `EncryptedSharedPreferences`, and `NativeSupabaseSessionStore` allows persistent session material only when the backing store reports secure-at-rest storage or plaintext persistence is explicitly allowed. `npm run native:android:test` passed on 2026-05-17 KST for the secure backing-store contract.
- Impact: the prior plaintext-storage release blocker is reduced, but first-release signoff still needs APK runtime proof that real session material persists only through the encrypted store and is not logged or backed up in plaintext.
- Remediation: complete release install/relaunch smoke to prove encrypted persistence in a built APK, and decide whether AndroidX Security deprecation warnings are acceptable for first release or require a Keystore-backed DataStore migration.

```kotlin
class AndroidEncryptedKeyValueStore(context: Context) : NativeKeyValueStore {
    private val masterKey = MasterKey.Builder(context)
        .setKeyScheme(MasterKey.KeyScheme.AES256_GCM)
        .build()

    private val preferences = EncryptedSharedPreferences.create(
        context,
        "pws-native-secure",
        masterKey,
        EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
        EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM,
    )

    override fun getString(key: String): String? = preferences.getString(key, null)
    override fun putString(key: String, value: String) = preferences.edit().putString(key, value).apply()
    override fun remove(key: String) = preferences.edit().remove(key).apply()
}
```

### SEC-02 Tester password is embedded in Android BuildConfig

- Severity: HIGH
- Category: OWASP A05 Security Misconfiguration / A07 Identification and Authentication Failures
- Status: Mitigated for release; debug-only shared tester path remains
- Location: `apps/android-native/app/build.gradle.kts:20`, `apps/android-native/app/build.gradle.kts:22`, `apps/android-native/app/src/main/java/com/wxxtae/pws/nativepreview/domain/NativeTesterAuth.kt:37`
- Evidence: debug builds may read the tester password from an environment variable at build time. Release builds emit an empty value, `NativeTesterAuthBridge` returns no remote tester auth outside debug, and Android now includes an email/password auth path for release-capable login without bundling a shared tester password.
- Impact: debug APKs can still carry a shared tester credential if built with one, so debug artifacts must stay internal. Wider distribution should use per-user credentials entered at runtime.
- Remediation: keep shared tester credentials out of distributable builds, preserve the release email/password path, and verify signed release login with sanitized runtime evidence.

```kotlin
if (!BuildConfig.DEBUG) {
    return null
}
```

### SEC-03 Remote weather fallback can mask auth/backend failures

- Severity: MEDIUM
- Category: OWASP A04 Insecure Design / A09 Security Logging and Monitoring Failures
- Status: Mitigated for release; runtime evidence required
- Location: `apps/android-native/app/src/main/java/com/wxxtae/pws/nativepreview/domain/SupabaseWeatherRemoteSource.kt:122`
- Evidence: `FallbackWeatherRemoteSource` now surfaces a sanitized warning when debug fallback is used and release wiring disables fallback.
- Impact: QA can pass while the authenticated Edge Function path is broken, misconfigured, or missing a valid session. This is acceptable only as an explicit migration fallback.
- Remediation: keep the fallback behind a debug/migration flag, surface a sanitized diagnostic state, and fail closed for production builds.

```kotlin
if (!BuildConfig.DEBUG && primaryFailure != null) {
    throw primaryFailure
}
```

### SEC-04 iOS secure session and remote runtime clients exist; release proof remains scoped

- Severity: MEDIUM
- Category: OWASP A07 Identification and Authentication Failures
- Status: Mitigated in code; simulator evidence collected; signed-release and accessibility evidence remain
- Location: `apps/ios-native/PWSNativePreview/Domain/Session/NativeKeyValueStore.swift`, `apps/ios-native/PWSNativePreview/Domain/Profile/ProfileContract.swift`, `apps/ios-native/PWSNativePreview/AppEnvironment.swift`
- Evidence: iOS wires `NativeSupabaseSessionStore` to `KeychainNativeKeyValueStore`, clears it on sign-out, restores stored sessions, and includes URLSession-backed `NativeSupabaseAuthClient`, `NativeSupabaseProfileClient`, `NativeSupabaseWeatherClient`, and `NativeSupabaseFeedbackRepository` coverage through fake-transport tests. XcodeBuildMCP `test_sim` passed 41/41 on 2026-05-24 KST under normal simulator signing. `npm run native:readiness` also regenerated a pass artifact on 2026-05-24 KST.
- Impact: client-side remote API construction and simulator session behavior are no longer contract-only. Commercial signoff still needs the normal store/release evidence lane.
- Remediation: keep signed-release, accessibility-extreme, and privacy/store checks as release blockers; do not treat simulator proof as App Store distribution proof.

### SEC-05 Profile request construction includes current-user filters but relies on RLS for final authority

- Severity: MEDIUM
- Category: OWASP A01 Broken Access Control
- Status: Accepted with backend dependency
- Location: `apps/android-native/app/src/main/java/com/wxxtae/pws/nativepreview/domain/NativeSupabaseProfileClient.kt:89`, `apps/android-native/app/src/main/java/com/wxxtae/pws/nativepreview/domain/NativeSupabaseProfileClient.kt:98`, `shared/contracts/users-profile.md`
- Evidence: native profile fetch/update URLs filter by caller-supplied user id and include an authenticated user credential. The shared contract states RLS must enforce `id = auth.uid()`.
- Impact: client-side filters are not sufficient by themselves; a compromised client could request another id unless RLS is correct.
- Remediation: keep RLS as the authoritative control and add safe read-only backend verification evidence before final release. Do not add admin credentials to clients.

### SEC-06 Request builders and user-facing errors are mostly safe

- Severity: LOW
- Category: OWASP A03 Injection / A05 Security Misconfiguration
- Status: Accepted
- Location: `apps/android-native/app/src/main/java/com/wxxtae/pws/nativepreview/domain/NativeSupabaseAuthClient.kt:49`, `apps/android-native/app/src/main/java/com/wxxtae/pws/nativepreview/domain/NativeSupabaseProfileClient.kt:89`, `apps/android-native/app/src/main/java/com/wxxtae/pws/nativepreview/domain/SupabaseWeatherRemoteSource.kt:139`, `apps/ios-native/PWSNativePreview/Domain/Weather/WeatherOneCallContract.swift:18`
- Evidence: JSON values are escaped, profile ids are URL-encoded, remote weather validates nonblank auth input, and backend error bodies are mapped to stable Korean messages rather than exposed raw.
- Residual risk: custom JSON builders/parsers are easy to drift; prefer platform JSON encoders as clients expand.

### SEC-07 dependency license review is clean; native vulnerability audit tooling still needs a release lane

- Severity: LOW
- Category: OWASP A06 Vulnerable and Outdated Components
- Status: Mitigated for license review; vulnerability audit follow-up remains
- Evidence: `npm audit --omit=dev` passes after removing the old cross-platform runtime packages from the root npm workspace. `npm run release:sbom` generated a passing npm lockfile inventory with zero unknown license entries. `docs/migration/native-parity-readiness/native-dependency-license-review.md` documents Android release runtime dependencies and confirms the iOS native project has no Swift Package/CocoaPods/Carthage dependencies.
- Impact: npm and native license-review blockers are closed for the release-readiness lane, but Android native dependencies still do not have a dedicated vulnerability-audit command comparable to `npm audit`.
- Remediation: add a native dependency vulnerability audit lane before production signoff.

## Checklist

- No hardcoded real secrets found in native source scan: pass for inspected source; test fixtures use dummy values only.
- No admin backend key in native Android/iOS app code: pass.
- Auth/session storage: Android session persistence is wired to an encrypted backing store and has QA-signed relaunch evidence; iOS uses a Keychain-backed store and clears it on sign-out.
- Request construction: pass with noted reliance on RLS.
- Tester fallback boundaries: Android release disables bundled tester auth and preview weather fallback; iOS runtime path still needs live adapter evidence.
- iOS config injection: simulator launch-env contract is documented in `PWSConfig`; missing public URL/anon-key failures are controlled before network calls, and simulator runtime proof is now collected.
- User-safe errors: pass for inspected auth/profile/weather clients.
- Logging: pass for inspected native sources; no credential-bearing `Log`, `print`, `NSLog`, or `os_log` calls found.
- QA artifact hygiene: pass for existing readiness sanitizer expectation; this artifact intentionally avoids credential-shaped strings.
- Dependency audit: partial; npm audit and native dependency/license review pass, but Android native vulnerability audit is not available in current Gradle setup.

## Residual Risks

- Supabase Auth leaked-password protection is disabled in the live project and must be enabled from the Dashboard before store release.
- The weather Edge Function timeout/stale-cache hardening is verified locally but not yet deployed to the live Supabase project.
- iOS auth/weather/feedback runtime implementation is simulator/build verified, but final commercial posture still depends on signed-release and accessibility-extreme evidence.
- Existing repo history contains dummy fixture credential strings and documentation references; no real secret value was printed or recorded in this artifact.
- npm SBOM generation is repeatable and currently reports zero unknown license entries. Native dependency license review is documented separately; native vulnerability audit remains a follow-up.
