# Native Dependency And License Review

Status: pass for first native release review lane
Evidence status: `pass`
Date: 2026-05-17 KST

## Scope

This review covers dependencies linked directly into the Android native preview and iOS native preview targets. It does not replace the npm SBOM, store review, or a formal legal approval.

## Evidence

- Android release dependency graph: `JAVA_HOME="$(node scripts/java21-home.js)" ANDROID_HOME="${ANDROID_HOME:-$HOME/Library/Android/sdk}" android/gradlew -p apps/android-native :app:dependencies --configuration releaseRuntimeClasspath` passed on 2026-05-17 16:26 KST.
- Android release build gate: `npm run native:android:verify` passed on 2026-05-17 16:25 KST.
- iOS dependency scan: no `Package.resolved`, `Podfile`, `Cartfile`, or embedded Swift Package references were found under `apps/ios-native`; the native iOS target currently uses Apple SDK frameworks plus first-party Swift code.

## Android Direct Runtime Dependencies

| Dependency | Purpose | License posture |
| --- | --- | --- |
| `org.jetbrains.kotlin:kotlin-stdlib:2.1.20` | Kotlin runtime | JetBrains/Kotlin standard Apache-2.0 posture |
| `androidx.activity:activity-compose:1.9.0` | Compose activity integration | AndroidX permissive Apache-2.0 posture |
| `androidx.compose.runtime:runtime-android:1.9.0` | Compose runtime | AndroidX permissive Apache-2.0 posture |
| `androidx.compose.ui:ui-android:1.9.0` | Compose UI | AndroidX permissive Apache-2.0 posture |
| `androidx.compose.ui:ui-tooling-preview-android:1.9.0` | Preview metadata in runtime classpath | AndroidX permissive Apache-2.0 posture |
| `androidx.compose.foundation:foundation-android:1.9.0` | Compose foundation widgets | AndroidX permissive Apache-2.0 posture |
| `androidx.compose.foundation:foundation-layout-android:1.9.0` | Compose layout primitives | AndroidX permissive Apache-2.0 posture |
| `androidx.navigation:navigation-compose-android:2.9.0` | Native navigation | AndroidX permissive Apache-2.0 posture |
| `androidx.lifecycle:lifecycle-runtime-ktx-android:2.9.0` | Lifecycle runtime | AndroidX permissive Apache-2.0 posture |
| `androidx.security:security-crypto:1.1.0` | Encrypted session storage | AndroidX permissive Apache-2.0 posture; includes Tink/Gson transitives |

## Transitive Notes

- The release graph includes AndroidX, Kotlin, Kotlin coroutines/serialization, Tink Android, Gson, Guava `listenablefuture`, and JSpecify transitives. No copyleft or unknown native runtime dependency was identified in the release runtime graph.
- `junit:junit:4.13.2` is test-only and is not part of `releaseRuntimeClasspath`.
- `androidx.security:security-crypto:1.1.0` remains acceptable for first release, but the deprecation/migration note in the first-release plan should stay tracked as P2 hardening.

## iOS Native Dependencies

The iOS native target has no third-party package manager dependencies in the checked-in project. It uses SwiftUI/Foundation/Security/URLSession/Keychain-related Apple SDK surfaces and first-party app code.

## Decision

Native dependency/license review is closed for this release-readiness lane. Remaining release blockers are runtime/live backend/signing/privacy evidence, not native dependency license clearance.
