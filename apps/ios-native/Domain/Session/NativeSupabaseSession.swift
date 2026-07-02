import Foundation

struct NativeSupabaseSession: Equatable {
    let accessToken: String
    let refreshToken: String?
    let expiresAtEpochSeconds: Int64?
    let userId: String?
    let userEmail: String?

    init(
        accessToken: String,
        refreshToken: String?,
        expiresAtEpochSeconds: Int64?,
        userId: String?,
        userEmail: String? = nil
    ) {
        self.accessToken = accessToken
        self.refreshToken = refreshToken
        self.expiresAtEpochSeconds = expiresAtEpochSeconds
        self.userId = userId
        self.userEmail = userEmail
    }

    func isUsable(nowEpochSeconds: Int64) -> Bool {
        guard !accessToken.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else { return false }
        guard let expiresAtEpochSeconds else { return true }
        return expiresAtEpochSeconds - NativeSupabaseSessionStore.tokenExpirySkewSeconds > nowEpochSeconds
    }
}

final class NativeSupabaseSessionStore {
    static let accessTokenKey = "supabase.access_token"
    static let refreshTokenKey = "supabase.refresh_token"
    static let expiresAtKey = "supabase.expires_at_epoch_seconds"
    static let userIdKey = "supabase.user_id"
    static let userEmailKey = "supabase.user_email"
    static let tokenExpirySkewSeconds: Int64 = 60

    private let keyValueStore: NativeKeyValueStore

    init(keyValueStore: NativeKeyValueStore) {
        self.keyValueStore = keyValueStore
    }

    func save(_ session: NativeSupabaseSession) throws {
        let accessToken = session.accessToken.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !accessToken.isEmpty else { throw NativeSupabaseSessionError.blankAccessToken }
        try keyValueStore.setString(accessToken, forKey: Self.accessTokenKey)

        try setOptional(session.refreshToken, key: Self.refreshTokenKey)
        if let expiresAtEpochSeconds = session.expiresAtEpochSeconds {
            try keyValueStore.setString(String(expiresAtEpochSeconds), forKey: Self.expiresAtKey)
        } else {
            try keyValueStore.removeValue(forKey: Self.expiresAtKey)
        }
        try setOptional(session.userId, key: Self.userIdKey)
        try setOptional(session.userEmail, key: Self.userEmailKey)
    }

    func load() -> NativeSupabaseSession? {
        let accessToken = keyValueStore.string(forKey: Self.accessTokenKey)?
            .trimmingCharacters(in: .whitespacesAndNewlines) ?? ""
        guard !accessToken.isEmpty else { return nil }
        return NativeSupabaseSession(
            accessToken: accessToken,
            refreshToken: optionalStoredValue(forKey: Self.refreshTokenKey),
            expiresAtEpochSeconds: optionalStoredValue(forKey: Self.expiresAtKey).flatMap(Int64.init),
            userId: optionalStoredValue(forKey: Self.userIdKey),
            userEmail: optionalStoredValue(forKey: Self.userEmailKey)
        )
    }

    func validAccessToken(nowEpochSeconds: Int64 = Int64(Date().timeIntervalSince1970)) -> String? {
        guard let session = load(), session.isUsable(nowEpochSeconds: nowEpochSeconds) else { return nil }
        return session.accessToken
    }

    func clear() throws {
        try keyValueStore.removeValue(forKey: Self.accessTokenKey)
        try keyValueStore.removeValue(forKey: Self.refreshTokenKey)
        try keyValueStore.removeValue(forKey: Self.expiresAtKey)
        try keyValueStore.removeValue(forKey: Self.userIdKey)
        try keyValueStore.removeValue(forKey: Self.userEmailKey)
    }

    private func setOptional(_ value: String?, key: String) throws {
        let normalized = value?.trimmingCharacters(in: .whitespacesAndNewlines) ?? ""
        if normalized.isEmpty {
            try keyValueStore.removeValue(forKey: key)
        } else {
            try keyValueStore.setString(normalized, forKey: key)
        }
    }

    private func optionalStoredValue(forKey key: String) -> String? {
        let value = keyValueStore.string(forKey: key)?.trimmingCharacters(in: .whitespacesAndNewlines) ?? ""
        return value.isEmpty ? nil : value
    }
}

enum NativeSupabaseSessionError: Error, Equatable {
    case blankAccessToken
}

enum NativeSupabaseAccountDeletionError: Error, Equatable {
    case missingSupabaseURL
    case missingUsableSession
    case httpStatus(Int)
}

final class NativeSupabaseAccountDeletionClient: @unchecked Sendable {
    private let config: PWSConfig
    private let sessionStore: NativeSupabaseSessionStore
    private let transport: NativeHTTPTransport
    private let nowEpochSeconds: () -> Int64

    init(
        config: PWSConfig,
        sessionStore: NativeSupabaseSessionStore,
        transport: NativeHTTPTransport = URLSessionNativeHTTPTransport(),
        nowEpochSeconds: @escaping () -> Int64 = { Int64(Date().timeIntervalSince1970) }
    ) {
        self.config = config
        self.sessionStore = sessionStore
        self.transport = transport
        self.nowEpochSeconds = nowEpochSeconds
    }

    func deleteOwnAccount() async throws {
        let normalizedURL = config.supabaseURL
            .trimmingCharacters(in: .whitespacesAndNewlines)
            .trimmingCharacters(in: CharacterSet(charactersIn: "/"))
        guard !normalizedURL.isEmpty, let url = URL(string: "\(normalizedURL)/rest/v1/rpc/delete_own_account") else {
            throw NativeSupabaseAccountDeletionError.missingSupabaseURL
        }
        guard let accessToken = sessionStore.validAccessToken(nowEpochSeconds: nowEpochSeconds()) else {
            throw NativeSupabaseAccountDeletionError.missingUsableSession
        }
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.httpBody = Data("{}".utf8)
        try ProfileContract().headers(anonKey: config.supabaseAnonKey, accessToken: accessToken)
            .forEach { key, value in
                request.setValue(value, forHTTPHeaderField: key)
            }
        let response = try await transport.data(for: request)
        guard (200...299).contains(response.statusCode) else {
            throw NativeSupabaseAccountDeletionError.httpStatus(response.statusCode)
        }
    }
}

final class NativeSupabaseAuthClient: @unchecked Sendable {
    private let config: PWSConfig
    private let sessionStore: NativeSupabaseSessionStore
    private let transport: NativeHTTPTransport
    private let nowEpochSeconds: () -> Int64
    private let testerAuth: TesterAuth
    private let encoder: JSONEncoder
    private let decoder: JSONDecoder

    init(
        config: PWSConfig,
        sessionStore: NativeSupabaseSessionStore,
        transport: NativeHTTPTransport = URLSessionNativeHTTPTransport(),
        nowEpochSeconds: @escaping () -> Int64 = { Int64(Date().timeIntervalSince1970) },
        testerAuth: TesterAuth = TesterAuth()
    ) {
        self.config = config
        self.sessionStore = sessionStore
        self.transport = transport
        self.nowEpochSeconds = nowEpochSeconds
        self.testerAuth = testerAuth
        self.encoder = JSONEncoder()
        self.encoder.outputFormatting = [.sortedKeys]
        self.decoder = JSONDecoder()
    }

    @discardableResult
    func signInTester(testerId: String) async throws -> NativeSupabaseSession {
        guard let authConfig = testerAuth.resolveOptionalTesterAuthConfig(rawPassword: config.testerPassword) else {
            throw NativeSupabaseAuthClientError.missingTesterPassword
        }
        return try await signInWithPassword(email: testerAuth.testerEmail(for: testerId), password: authConfig.password)
    }

    @discardableResult
    func signInWithPassword(email: String, password: String) async throws -> NativeSupabaseSession {
        var request = URLRequest(url: try authURL())
        request.httpMethod = "POST"
        try applyHeaders(to: &request)
        request.httpBody = try encoder.encode(PasswordGrantBody(
            email: normalizedRequired(email, error: .missingEmail),
            password: normalizedRequired(password, error: .missingPassword)
        ))

        let response = try await transport.data(for: request)
        guard (200...299).contains(response.statusCode) else {
            throw NativeSupabaseAuthClientError.httpStatus(response.statusCode)
        }

        let payload = try decoder.decode(PasswordGrantResponse.self, from: response.data)
        let session = try payload.session(nowEpochSeconds: nowEpochSeconds())
        try sessionStore.save(session)
        return session
    }

    private func authURL() throws -> URL {
        let trimmed = config.supabaseURL.trimmingCharacters(in: .whitespacesAndNewlines)
            .trimmingCharacters(in: CharacterSet(charactersIn: "/"))
        guard !trimmed.isEmpty, let url = URL(string: "\(trimmed)/auth/v1/token?grant_type=password") else {
            throw NativeSupabaseAuthClientError.missingSupabaseURL
        }
        return url
    }

    private func applyHeaders(to request: inout URLRequest) throws {
        let anonKey = config.supabaseAnonKey.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !anonKey.isEmpty else { throw NativeSupabaseAuthClientError.missingAnonKey }
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue("application/json", forHTTPHeaderField: "Accept")
        request.setValue(anonKey, forHTTPHeaderField: "apikey")
        request.setValue("pws-native-ios", forHTTPHeaderField: "x-client-info")
    }

    private func normalizedRequired(_ value: String, error: NativeSupabaseAuthClientError) throws -> String {
        let normalized = value.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !normalized.isEmpty else { throw error }
        return normalized
    }
}

enum NativeSupabaseAuthClientError: Error, Equatable {
    case missingSupabaseURL
    case missingAnonKey
    case missingEmail
    case missingPassword
    case missingTesterPassword
    case blankAccessToken
    case httpStatus(Int)
}

private struct PasswordGrantBody: Encodable {
    let email: String
    let password: String
}

private struct PasswordGrantResponse: Decodable {
    let accessToken: String
    let refreshToken: String?
    let expiresAt: Int64?
    let expiresIn: Int64?
    let user: PasswordGrantUser?

    enum CodingKeys: String, CodingKey {
        case accessToken = "access_token"
        case refreshToken = "refresh_token"
        case expiresAt = "expires_at"
        case expiresIn = "expires_in"
        case user
    }

    func session(nowEpochSeconds: Int64) throws -> NativeSupabaseSession {
        let accessToken = accessToken.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !accessToken.isEmpty else { throw NativeSupabaseAuthClientError.blankAccessToken }
        let expiresAtEpochSeconds = expiresAt ?? expiresIn.map { nowEpochSeconds + $0 }
        return NativeSupabaseSession(
            accessToken: accessToken,
            refreshToken: refreshToken?.trimmingCharacters(in: .whitespacesAndNewlines).emptyToNil(),
            expiresAtEpochSeconds: expiresAtEpochSeconds,
            userId: user?.id.trimmingCharacters(in: .whitespacesAndNewlines).emptyToNil(),
            userEmail: user?.email?.trimmingCharacters(in: .whitespacesAndNewlines).emptyToNil()
        )
    }
}

private struct PasswordGrantUser: Decodable {
    let id: String
    let email: String?
}

private extension String {
    func emptyToNil() -> String? {
        isEmpty ? nil : self
    }
}
