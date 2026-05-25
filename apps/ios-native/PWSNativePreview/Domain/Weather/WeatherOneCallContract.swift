import Foundation

struct CurrentWeatherNative: Equatable, Decodable {
    let temp: Double
    let feelsLike: Double
    let humidity: Int
    let windSpeed: Double
    let weatherCode: Int
    let weatherDescription: String
    let uvIndex: Double
    let precipitation1h: Double?
    let tmrtApi: Double?

    enum CodingKeys: String, CodingKey {
        case temp
        case feelsLike = "feels_like"
        case humidity
        case windSpeed = "wind_speed"
        case weatherCode = "weather_code"
        case weatherDescription = "weather_desc"
        case uvIndex = "uv_index"
        case precipitation1h = "precipitation_1h"
        case tmrtApi = "tmrt_api"
    }
}

struct HourlyForecastNative: Equatable, Decodable {
    let dt: Int64
    let temp: Double
    let feelsLike: Double
    let humidity: Int
    let windSpeed: Double
    let weatherCode: Int
    let weatherDescription: String
    let pop: Double
    let precipitation1h: Double?

    enum CodingKeys: String, CodingKey {
        case dt
        case temp
        case feelsLike = "feels_like"
        case humidity
        case windSpeed = "wind_speed"
        case weatherCode = "weather_code"
        case weatherDescription = "weather_desc"
        case pop
        case precipitation1h = "precipitation_1h"
    }
}

struct DailyForecastNative: Equatable, Decodable {
    let dt: Int64
    let tempMin: Double
    let tempMax: Double
    let humidity: Int
    let windSpeed: Double
    let weatherCode: Int
    let weatherDescription: String
    let weatherIcon: String
    let pop: Double
    let uvIndex: Double

    enum CodingKeys: String, CodingKey {
        case dt
        case tempMin = "temp_min"
        case tempMax = "temp_max"
        case humidity
        case windSpeed = "wind_speed"
        case weatherCode = "weather_code"
        case weatherDescription = "weather_desc"
        case weatherIcon = "weather_icon"
        case pop
        case uvIndex = "uv_index"
    }

    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        dt = try container.decode(Int64.self, forKey: .dt)
        tempMin = try container.decode(Double.self, forKey: .tempMin)
        tempMax = try container.decode(Double.self, forKey: .tempMax)
        humidity = try container.decode(Int.self, forKey: .humidity)
        windSpeed = try container.decode(Double.self, forKey: .windSpeed)
        weatherCode = try container.decodeIfPresent(Int.self, forKey: .weatherCode) ?? 800
        weatherDescription = try container.decodeIfPresent(String.self, forKey: .weatherDescription) ?? "-"
        weatherIcon = try container.decodeIfPresent(String.self, forKey: .weatherIcon) ?? ""
        pop = try container.decodeIfPresent(Double.self, forKey: .pop) ?? 0
        uvIndex = try container.decodeIfPresent(Double.self, forKey: .uvIndex) ?? 0
    }
}

struct WeatherDataNative: Equatable, Decodable {
    let current: CurrentWeatherNative
    let hourly: [HourlyForecastNative]
    let daily: [DailyForecastNative]
    let fetchedAt: Int64
}

struct WeatherRepositoryState: Equatable {
    let data: WeatherDataNative?
    let isLoading: Bool
    let error: String?
    let lastLatitude: Double?
    let lastLongitude: Double?

    init(
        data: WeatherDataNative? = nil,
        isLoading: Bool = false,
        error: String? = nil,
        lastLatitude: Double? = nil,
        lastLongitude: Double? = nil
    ) {
        self.data = data
        self.isLoading = isLoading
        self.error = error
        self.lastLatitude = lastLatitude
        self.lastLongitude = lastLongitude
    }
}

struct WeatherOneCallContract {
    static let cacheTTL: TimeInterval = 30 * 60

    func endpoint(supabaseURL: String) throws -> URL {
        let trimmed = supabaseURL.trimmingCharacters(in: .whitespacesAndNewlines)
            .trimmingCharacters(in: CharacterSet(charactersIn: "/"))
        guard !trimmed.isEmpty, let url = URL(string: "\(trimmed)/functions/v1/weather-onecall") else {
            throw ContractError.missingSupabaseURL
        }
        return url
    }

    func requestBody(latitude: Double, longitude: Double) -> Data {
        let body = String(format: #"{"lat":%.6f,"lng":%.6f}"#, locale: Locale(identifier: "en_US_POSIX"), latitude, longitude)
        return Data(body.utf8)
    }

    func headers(anonKey: String, accessToken: String) throws -> [String: String] {
        let normalizedAnonKey = anonKey.trimmingCharacters(in: .whitespacesAndNewlines)
        let normalizedToken = accessToken.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !normalizedAnonKey.isEmpty else { throw ContractError.missingAnonKey }
        guard !normalizedToken.isEmpty else { throw ContractError.missingAccessToken }
        return [
            "Content-Type": "application/json",
            "Accept": "application/json",
            "apikey": normalizedAnonKey,
            "Authorization": "Bearer \(normalizedToken)",
            "x-client-info": "pws-native-ios"
        ]
    }

    func urlRequest(supabaseURL: String, anonKey: String, accessToken: String, latitude: Double, longitude: Double) throws -> URLRequest {
        guard latitude.isFinite, (-90...90).contains(latitude), longitude.isFinite, (-180...180).contains(longitude) else {
            throw ContractError.invalidCoordinates
        }
        var request = URLRequest(url: try endpoint(supabaseURL: supabaseURL))
        request.httpMethod = "POST"
        request.httpBody = requestBody(latitude: latitude, longitude: longitude)
        try headers(anonKey: anonKey, accessToken: accessToken).forEach { key, value in
            request.setValue(value, forHTTPHeaderField: key)
        }
        return request
    }

    func shouldUseCache(cachedLatitude: Double?, cachedLongitude: Double?, fetchedAt: Date?, latitude: Double, longitude: Double, now: Date, force: Bool = false) -> Bool {
        guard !force, cachedLatitude == latitude, cachedLongitude == longitude, let fetchedAt else {
            return false
        }
        return now.timeIntervalSince(fetchedAt) < Self.cacheTTL
    }
}

enum ContractError: Error, Equatable {
    case missingSupabaseURL
    case missingAnonKey
    case missingAccessToken
    case invalidCoordinates
}

final class NativeSupabaseWeatherClient: @unchecked Sendable {
    private let config: PWSConfig
    private let sessionStore: NativeSupabaseSessionStore
    private let contract: WeatherOneCallContract
    private let transport: NativeHTTPTransport
    private let decoder: JSONDecoder
    private let nowEpochSeconds: () -> Int64

    init(
        config: PWSConfig,
        sessionStore: NativeSupabaseSessionStore,
        contract: WeatherOneCallContract = WeatherOneCallContract(),
        transport: NativeHTTPTransport = URLSessionNativeHTTPTransport(),
        nowEpochSeconds: @escaping () -> Int64 = { Int64(Date().timeIntervalSince1970) }
    ) {
        self.config = config
        self.sessionStore = sessionStore
        self.contract = contract
        self.transport = transport
        self.decoder = JSONDecoder()
        self.nowEpochSeconds = nowEpochSeconds
    }

    func fetchWeather(latitude: Double, longitude: Double) async throws -> WeatherDataNative {
        guard let accessToken = sessionStore.validAccessToken(nowEpochSeconds: nowEpochSeconds()) else {
            throw NativeSupabaseWeatherClientError.missingUsableSession
        }
        let request = try contract.urlRequest(
            supabaseURL: config.supabaseURL,
            anonKey: config.supabaseAnonKey,
            accessToken: accessToken,
            latitude: latitude,
            longitude: longitude
        )
        let response = try await transport.data(for: request)
        guard (200...299).contains(response.statusCode) else {
            throw NativeSupabaseWeatherClientError.httpStatus(response.statusCode)
        }
        return try decoder.decode(WeatherDataNative.self, from: response.data)
    }
}

enum NativeSupabaseWeatherClientError: Error, Equatable {
    case missingUsableSession
    case httpStatus(Int)
}
