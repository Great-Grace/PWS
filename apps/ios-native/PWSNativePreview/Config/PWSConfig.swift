import Foundation

struct PWSConfig: Equatable {
    static let supabaseURLEnvironmentKey = "EXPO_PUBLIC_SUPABASE_URL"
    static let supabaseAnonKeyEnvironmentKey = "EXPO_PUBLIC_SUPABASE_ANON_KEY"
    static let testerPasswordEnvironmentKey = "EXPO_PUBLIC_TEST_PASSWORD"
    static let supabaseURLInfoPlistKey = "PWSSupabaseURL"
    static let supabaseAnonKeyInfoPlistKey = "PWSSupabaseAnonKey"
    static let testerPasswordInfoPlistKey = "PWSTesterPassword"
    static let simulatorLaunchConfigContract = "SIMCTL_CHILD_EXPO_PUBLIC_SUPABASE_URL=<url> SIMCTL_CHILD_EXPO_PUBLIC_SUPABASE_ANON_KEY=<anon-key> SIMCTL_CHILD_EXPO_PUBLIC_TEST_PASSWORD=<tester-password> xcrun simctl launch booted woos.owndo"

    let supabaseURL: String
    let supabaseAnonKey: String
    let testerPassword: String

    static func fromEnvironment(
        _ environment: [String: String] = ProcessInfo.processInfo.environment,
        bundleInfo: [String: Any] = Bundle.main.infoDictionary ?? [:]
    ) -> PWSConfig {
        PWSConfig(
            supabaseURL: runtimeValue(
                environmentKey: Self.supabaseURLEnvironmentKey,
                infoPlistKey: Self.supabaseURLInfoPlistKey,
                environment: environment,
                bundleInfo: bundleInfo
            ),
            supabaseAnonKey: runtimeValue(
                environmentKey: Self.supabaseAnonKeyEnvironmentKey,
                infoPlistKey: Self.supabaseAnonKeyInfoPlistKey,
                environment: environment,
                bundleInfo: bundleInfo
            ),
            testerPassword: runtimeValue(
                environmentKey: Self.testerPasswordEnvironmentKey,
                infoPlistKey: Self.testerPasswordInfoPlistKey,
                environment: environment,
                bundleInfo: bundleInfo
            )
        )
    }

    private static func runtimeValue(
        environmentKey: String,
        infoPlistKey: String,
        environment: [String: String],
        bundleInfo: [String: Any]
    ) -> String {
        normalizedRuntimeValue(environment[environmentKey])
            ?? normalizedRuntimeValue(environment["SIMCTL_CHILD_\(environmentKey)"])
            ?? normalizedRuntimeValue(bundleInfo[infoPlistKey] as? String)
            ?? ""
    }

    private static func normalizedRuntimeValue(_ value: String?) -> String? {
        let normalized = value?.trimmingCharacters(in: .whitespacesAndNewlines) ?? ""
        guard !normalized.isEmpty, !isUnresolvedBuildSetting(normalized) else { return nil }
        return normalized
    }

    private static func isUnresolvedBuildSetting(_ value: String) -> Bool {
        value.hasPrefix("$(") && value.hasSuffix(")")
    }

    func validatePublicRuntimeConfig() throws {
        guard !supabaseURL.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else {
            throw PWSConfigError.missingSupabaseURL
        }
        guard !supabaseAnonKey.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else {
            throw PWSConfigError.missingAnonKey
        }
    }
}

enum PWSConfigError: Error, Equatable {
    case missingSupabaseURL
    case missingAnonKey
}
