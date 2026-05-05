import Foundation

struct AppEnvironment {
    let config: PWSConfig
    let testerAuth: TesterAuth
    let weatherContract: WeatherOneCallContract

    static let preview = AppEnvironment(
        config: .fromEnvironment(),
        testerAuth: TesterAuth(),
        weatherContract: WeatherOneCallContract()
    )
}

