import Foundation

enum ProfileGender: String, Equatable, Decodable {
    case male = "M"
    case female = "F"
    case none = "N"
}

struct NativeUserProfileRecord: Equatable, Decodable {
    let id: String
    let email: String
    let nickname: String
    let defaultLatitude: Double?
    let defaultLongitude: Double?
    let climateZone: String?
    let onboardingDone: Bool
    let birthYear: Int?
    let gender: ProfileGender?
    let notifyEnabled: Bool
    let notifyOutfit: Bool
    let notifyRain: Bool

    enum CodingKeys: String, CodingKey {
        case id
        case email
        case nickname
        case defaultLatitude = "default_lat"
        case defaultLongitude = "default_lng"
        case climateZone = "climate_zone"
        case onboardingDone = "onboarding_done"
        case birthYear = "birth_year"
        case gender
        case notifyEnabled = "notify_enabled"
        case notifyOutfit = "notify_outfit"
        case notifyRain = "notify_rain"
    }

    var regionParts: (province: String?, district: String?) {
        let parts = climateZone?
            .split(whereSeparator: { $0.isWhitespace })
            .map(String.init) ?? []
        if parts.isEmpty { return (nil, nil) }
        if parts.count == 1 { return (parts[0], nil) }
        return (parts[0], parts.dropFirst().joined(separator: " "))
    }
}

struct NativeUserOnboardingUpsert: Encodable, Equatable {
    let id: String
    let email: String
    let nickname: String
    let defaultLatitude: Double
    let defaultLongitude: Double
    let climateZone: String
    let birthYear: Int?
    let gender: ProfileGender?

    enum CodingKeys: String, CodingKey {
        case id
        case email
        case nickname
        case defaultLatitude = "default_lat"
        case defaultLongitude = "default_lng"
        case climateZone = "climate_zone"
        case onboardingDone = "onboarding_done"
        case birthYear = "birth_year"
        case gender
    }

    func encode(to encoder: Encoder) throws {
        var container = encoder.container(keyedBy: CodingKeys.self)
        try container.encode(id, forKey: .id)
        try container.encode(email, forKey: .email)
        try container.encode(nickname, forKey: .nickname)
        try container.encode(defaultLatitude, forKey: .defaultLatitude)
        try container.encode(defaultLongitude, forKey: .defaultLongitude)
        try container.encode(climateZone, forKey: .climateZone)
        try container.encode(true, forKey: .onboardingDone)
        try container.encodeIfPresent(birthYear, forKey: .birthYear)
        try container.encodeIfPresent(gender?.rawValue, forKey: .gender)
    }
}

struct NativeUserProfileUpdate: Encodable, Equatable {
    let nickname: String?
    let defaultLatitude: Double?
    let defaultLongitude: Double?
    let climateZone: String?
    let birthYear: Int?
    let gender: ProfileGender?
    let notifyEnabled: Bool?
    let notifyOutfit: Bool?
    let notifyRain: Bool?

    init(
        nickname: String? = nil,
        defaultLatitude: Double? = nil,
        defaultLongitude: Double? = nil,
        climateZone: String? = nil,
        birthYear: Int? = nil,
        gender: ProfileGender? = nil,
        notifyEnabled: Bool? = nil,
        notifyOutfit: Bool? = nil,
        notifyRain: Bool? = nil
    ) {
        self.nickname = nickname
        self.defaultLatitude = defaultLatitude
        self.defaultLongitude = defaultLongitude
        self.climateZone = climateZone
        self.birthYear = birthYear
        self.gender = gender
        self.notifyEnabled = notifyEnabled
        self.notifyOutfit = notifyOutfit
        self.notifyRain = notifyRain
    }

    enum CodingKeys: String, CodingKey {
        case nickname
        case defaultLatitude = "default_lat"
        case defaultLongitude = "default_lng"
        case climateZone = "climate_zone"
        case birthYear = "birth_year"
        case gender
        case notifyEnabled = "notify_enabled"
        case notifyOutfit = "notify_outfit"
        case notifyRain = "notify_rain"
    }

    func encode(to encoder: Encoder) throws {
        var container = encoder.container(keyedBy: CodingKeys.self)
        try container.encodeIfPresent(nickname, forKey: .nickname)
        try container.encodeIfPresent(defaultLatitude, forKey: .defaultLatitude)
        try container.encodeIfPresent(defaultLongitude, forKey: .defaultLongitude)
        try container.encodeIfPresent(climateZone, forKey: .climateZone)
        try container.encodeIfPresent(birthYear, forKey: .birthYear)
        try container.encodeIfPresent(gender?.rawValue, forKey: .gender)
        try container.encodeIfPresent(notifyEnabled, forKey: .notifyEnabled)
        try container.encodeIfPresent(notifyOutfit, forKey: .notifyOutfit)
        try container.encodeIfPresent(notifyRain, forKey: .notifyRain)
    }
}

struct ProfileContract {
    func baseRestURL(supabaseURL: String) throws -> URL {
        let trimmed = supabaseURL.trimmingCharacters(in: .whitespacesAndNewlines)
            .trimmingCharacters(in: CharacterSet(charactersIn: "/"))
        guard !trimmed.isEmpty, let url = URL(string: "\(trimmed)/rest/v1/users") else {
            throw ProfileContractError.missingSupabaseURL
        }
        return url
    }

    func fetchURL(supabaseURL: String, userId: String) throws -> URL {
        try components(supabaseURL: supabaseURL, queryItems: [
            URLQueryItem(name: "id", value: "eq.\(userId)"),
            URLQueryItem(name: "select", value: "*")
        ])
    }

    func upsertURL(supabaseURL: String) throws -> URL {
        try components(supabaseURL: supabaseURL, queryItems: [
            URLQueryItem(name: "on_conflict", value: "id")
        ])
    }

    func updateURL(supabaseURL: String, userId: String) throws -> URL {
        try components(supabaseURL: supabaseURL, queryItems: [
            URLQueryItem(name: "id", value: "eq.\(userId)")
        ])
    }

    func headers(anonKey: String, accessToken: String, prefer: String? = nil) throws -> [String: String] {
        let normalizedAnonKey = anonKey.trimmingCharacters(in: .whitespacesAndNewlines)
        let normalizedToken = accessToken.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !normalizedAnonKey.isEmpty else { throw ProfileContractError.missingAnonKey }
        guard !normalizedToken.isEmpty else { throw ProfileContractError.missingAccessToken }
        var headers = [
            "Content-Type": "application/json",
            "Accept": "application/json",
            "apikey": normalizedAnonKey,
            "Authorization": "Bearer \(normalizedToken)",
            "x-client-info": "pws-native-ios"
        ]
        if let prefer, !prefer.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
            headers["Prefer"] = prefer
        }
        return headers
    }

    func onboardingBody(_ record: NativeUserOnboardingUpsert) throws -> Data {
        try encode(record)
    }

    func updateBody(_ update: NativeUserProfileUpdate) throws -> Data {
        try encode(update)
    }

    private func components(supabaseURL: String, queryItems: [URLQueryItem]) throws -> URL {
        let base = try baseRestURL(supabaseURL: supabaseURL)
        guard var components = URLComponents(url: base, resolvingAgainstBaseURL: false) else {
            throw ProfileContractError.missingSupabaseURL
        }
        components.queryItems = queryItems
        guard let url = components.url else { throw ProfileContractError.missingSupabaseURL }
        return url
    }

    private func encode<T: Encodable>(_ value: T) throws -> Data {
        let encoder = JSONEncoder()
        encoder.outputFormatting = [.sortedKeys]
        return try encoder.encode(value)
    }
}

enum ProfileContractError: Error, Equatable {
    case missingSupabaseURL
    case missingAnonKey
    case missingAccessToken
}

struct NativeHTTPResponse: Equatable {
    let statusCode: Int
    let data: Data
}

protocol NativeHTTPTransport: AnyObject {
    func data(for request: URLRequest) async throws -> NativeHTTPResponse
}

final class URLSessionNativeHTTPTransport: NativeHTTPTransport {
    private let timeoutInterval: TimeInterval

    init(timeoutInterval: TimeInterval = 10) {
        self.timeoutInterval = timeoutInterval
    }

    func data(for request: URLRequest) async throws -> NativeHTTPResponse {
        var request = request
        request.timeoutInterval = timeoutInterval
        let (data, response) = try await URLSession.shared.data(for: request)
        guard let httpResponse = response as? HTTPURLResponse else {
            throw NativeSupabaseProfileClientError.invalidResponse
        }
        return NativeHTTPResponse(statusCode: httpResponse.statusCode, data: data)
    }
}

final class NativeSupabaseProfileClient {
    private let config: PWSConfig
    private let sessionStore: NativeSupabaseSessionStore
    private let contract: ProfileContract
    private let transport: NativeHTTPTransport
    private let decoder: JSONDecoder

    init(
        config: PWSConfig,
        sessionStore: NativeSupabaseSessionStore,
        contract: ProfileContract = ProfileContract(),
        transport: NativeHTTPTransport = URLSessionNativeHTTPTransport()
    ) {
        self.config = config
        self.sessionStore = sessionStore
        self.contract = contract
        self.transport = transport
        self.decoder = JSONDecoder()
    }

    func fetchProfile(userId: String) async throws -> NativeUserProfileRecord? {
        let accessToken = try usableAccessToken()
        var request = URLRequest(url: try contract.fetchURL(supabaseURL: config.supabaseURL, userId: userId))
        request.httpMethod = "GET"
        try applyHeaders(to: &request, accessToken: accessToken)

        return try await sendRecordRequest(request)
    }

    func upsertOnboarding(_ record: NativeUserOnboardingUpsert) async throws -> NativeUserProfileRecord? {
        let accessToken = try usableAccessToken()
        var request = URLRequest(url: try contract.upsertURL(supabaseURL: config.supabaseURL))
        request.httpMethod = "POST"
        request.httpBody = try contract.onboardingBody(record)
        try applyHeaders(to: &request, accessToken: accessToken, prefer: "resolution=merge-duplicates,return=representation")

        return try await sendRecordRequest(request)
    }

    func updateProfile(userId: String, update: NativeUserProfileUpdate) async throws -> NativeUserProfileRecord? {
        let accessToken = try usableAccessToken()
        var request = URLRequest(url: try contract.updateURL(supabaseURL: config.supabaseURL, userId: userId))
        request.httpMethod = "PATCH"
        request.httpBody = try contract.updateBody(update)
        try applyHeaders(to: &request, accessToken: accessToken, prefer: "return=representation")

        return try await sendRecordRequest(request)
    }

    private func usableAccessToken() throws -> String {
        guard let accessToken = sessionStore.validAccessToken() else {
            throw NativeSupabaseProfileClientError.missingUsableSession
        }
        return accessToken
    }

    private func applyHeaders(to request: inout URLRequest, accessToken: String, prefer: String? = nil) throws {
        try contract.headers(anonKey: config.supabaseAnonKey, accessToken: accessToken, prefer: prefer)
            .forEach { key, value in
                request.setValue(value, forHTTPHeaderField: key)
            }
    }

    private func sendRecordRequest(_ request: URLRequest) async throws -> NativeUserProfileRecord? {
        let response = try await transport.data(for: request)
        guard (200...299).contains(response.statusCode) else {
            throw NativeSupabaseProfileClientError.httpStatus(response.statusCode)
        }
        return try decoder.decode([NativeUserProfileRecord].self, from: response.data).first
    }
}

enum NativeSupabaseProfileClientError: Error, Equatable {
    case missingUsableSession
    case invalidResponse
    case httpStatus(Int)
}
