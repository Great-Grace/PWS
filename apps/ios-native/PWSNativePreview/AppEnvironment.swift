import Foundation

struct AppEnvironment {
    let config: PWSConfig
    let testerAuth: TesterAuth
    let weatherContract: WeatherOneCallContract
    let sessionStore: NativeSupabaseSessionStore
    let authClient: NativeSupabaseAuthClient
    let profileClient: NativeSupabaseProfileClient
    let weatherClient: NativeSupabaseWeatherClient
    let feedbackRepository: NativeSupabaseFeedbackRepository
    let accountDeletionClient: NativeSupabaseAccountDeletionClient

    @MainActor static let preview: AppEnvironment = {
        let config = PWSConfig.fromEnvironment()
        let sessionStore = NativeSupabaseSessionStore(keyValueStore: KeychainNativeKeyValueStore())
        return AppEnvironment(
            config: config,
            testerAuth: TesterAuth(),
            weatherContract: WeatherOneCallContract(),
            sessionStore: sessionStore,
            authClient: NativeSupabaseAuthClient(config: config, sessionStore: sessionStore),
            profileClient: NativeSupabaseProfileClient(config: config, sessionStore: sessionStore),
            weatherClient: NativeSupabaseWeatherClient(config: config, sessionStore: sessionStore),
            feedbackRepository: NativeSupabaseFeedbackRepository(config: config, sessionStore: sessionStore),
            accountDeletionClient: NativeSupabaseAccountDeletionClient(config: config, sessionStore: sessionStore)
        )
    }()
}
