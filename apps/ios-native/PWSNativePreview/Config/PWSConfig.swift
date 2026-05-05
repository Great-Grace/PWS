import Foundation

struct PWSConfig: Equatable {
    let supabaseURL: String
    let supabaseAnonKey: String
    let testerPassword: String

    static func fromEnvironment(_ environment: [String: String] = ProcessInfo.processInfo.environment) -> PWSConfig {
        PWSConfig(
            supabaseURL: environment["EXPO_PUBLIC_SUPABASE_URL", default: ""],
            supabaseAnonKey: environment["EXPO_PUBLIC_SUPABASE_ANON_KEY", default: ""],
            testerPassword: environment["EXPO_PUBLIC_TEST_PASSWORD", default: ""]
        )
    }
}

