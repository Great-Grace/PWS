import XCTest
@testable import PWSNativePreview

final class TesterAuthTests: XCTestCase {
    func testPWSConfigDocumentsSimulatorEnvironmentInjectionContract() {
        XCTAssertEqual(PWSConfig.supabaseURLEnvironmentKey, "EXPO_PUBLIC_SUPABASE_URL")
        XCTAssertEqual(PWSConfig.supabaseAnonKeyEnvironmentKey, "EXPO_PUBLIC_SUPABASE_ANON_KEY")
        XCTAssertEqual(PWSConfig.testerPasswordEnvironmentKey, "EXPO_PUBLIC_TEST_PASSWORD")
        XCTAssertEqual(PWSConfig.supabaseURLInfoPlistKey, "PWSSupabaseURL")
        XCTAssertEqual(PWSConfig.supabaseAnonKeyInfoPlistKey, "PWSSupabaseAnonKey")
        XCTAssertTrue(PWSConfig.simulatorLaunchConfigContract.contains("xcrun simctl launch"))
        XCTAssertTrue(PWSConfig.simulatorLaunchConfigContract.contains("SIMCTL_CHILD_EXPO_PUBLIC_SUPABASE_URL"))
        XCTAssertTrue(PWSConfig.simulatorLaunchConfigContract.contains("woos.owndo"))
    }

    func testPWSConfigReadsPublicRuntimeConfigFromEnvironment() {
        let config = PWSConfig.fromEnvironment([
            PWSConfig.supabaseURLEnvironmentKey: "https://project.supabase.co",
            PWSConfig.supabaseAnonKeyEnvironmentKey: "anon-key",
            PWSConfig.testerPasswordEnvironmentKey: "tester-password"
        ])

        XCTAssertEqual(config.supabaseURL, "https://project.supabase.co")
        XCTAssertEqual(config.supabaseAnonKey, "anon-key")
        XCTAssertEqual(config.testerPassword, "tester-password")
    }

    func testPWSConfigReadsSimctlChildRuntimeConfigFromEnvironment() {
        let config = PWSConfig.fromEnvironment([
            "SIMCTL_CHILD_\(PWSConfig.supabaseURLEnvironmentKey)": "https://project.supabase.co",
            "SIMCTL_CHILD_\(PWSConfig.supabaseAnonKeyEnvironmentKey)": "anon-key",
            "SIMCTL_CHILD_\(PWSConfig.testerPasswordEnvironmentKey)": "tester-password"
        ])

        XCTAssertEqual(config.supabaseURL, "https://project.supabase.co")
        XCTAssertEqual(config.supabaseAnonKey, "anon-key")
        XCTAssertEqual(config.testerPassword, "tester-password")
    }

    func testPWSConfigFallsBackToInfoPlistRuntimeConfig() {
        let config = PWSConfig.fromEnvironment(
            [:],
            bundleInfo: [
                PWSConfig.supabaseURLInfoPlistKey: " https://project.supabase.co ",
                PWSConfig.supabaseAnonKeyInfoPlistKey: " anon-key ",
                PWSConfig.testerPasswordInfoPlistKey: " tester-password "
            ]
        )

        XCTAssertEqual(config.supabaseURL, "https://project.supabase.co")
        XCTAssertEqual(config.supabaseAnonKey, "anon-key")
        XCTAssertEqual(config.testerPassword, "tester-password")
    }

    func testPWSConfigIgnoresUnresolvedInfoPlistBuildSettings() {
        let config = PWSConfig.fromEnvironment(
            [:],
            bundleInfo: [
                PWSConfig.supabaseURLInfoPlistKey: "$(EXPO_PUBLIC_SUPABASE_URL)",
                PWSConfig.supabaseAnonKeyInfoPlistKey: "$(EXPO_PUBLIC_SUPABASE_ANON_KEY)",
                PWSConfig.testerPasswordInfoPlistKey: "$(EXPO_PUBLIC_TEST_PASSWORD)"
            ]
        )

        XCTAssertEqual(config, PWSConfig(supabaseURL: "", supabaseAnonKey: "", testerPassword: ""))
    }

    func testPWSConfigValidationRejectsMissingPublicRuntimeConfig() {
        XCTAssertThrowsError(try PWSConfig(supabaseURL: " ", supabaseAnonKey: "anon-key", testerPassword: "").validatePublicRuntimeConfig()) { error in
            XCTAssertEqual(error as? PWSConfigError, .missingSupabaseURL)
        }
        XCTAssertThrowsError(try PWSConfig(supabaseURL: "https://project.supabase.co", supabaseAnonKey: " ", testerPassword: "").validatePublicRuntimeConfig()) { error in
            XCTAssertEqual(error as? PWSConfigError, .missingAnonKey)
        }
    }

    func testTesterIdentityMatchesSharedAuthContract() {
        let auth = TesterAuth()

        XCTAssertEqual(auth.normalizedTesterId(" TaeWoo "), "taewoo")
        XCTAssertEqual(auth.testerEmail(for: " TaeWoo "), "taewoo@test.pws")
        XCTAssertEqual(auth.testerId(fromEmail: " Smoke_Primary@test.pws "), "smoke_primary")
        XCTAssertNil(auth.testerId(fromEmail: "person@example.com"))
        XCTAssertEqual(auth.localSessionId(for: " TaeWoo "), "dev-taewoo")
        XCTAssertTrue(auth.isLocalTesterSessionId("dev-taewoo"))
        XCTAssertFalse(auth.isLocalTesterSessionId("user-123"))
    }

    func testTesterConfigRejectsMissingPasswordWithoutSecrets() {
        let auth = TesterAuth()

        XCTAssertNil(auth.resolveOptionalTesterAuthConfig(rawPassword: "  "))
        XCTAssertThrowsError(try auth.resolveTesterAuthConfig(rawPassword: nil)) { error in
            XCTAssertEqual(error as? TesterAuthError, .missingPassword)
        }
        XCTAssertEqual(auth.resolveOptionalTesterAuthConfig(rawPassword: " secret ")?.password, "secret")
        XCTAssertEqual(auth.resolveOptionalTesterAuthConfig(rawPassword: " secret ")?.allowAutoSignup, false)
    }

    func testTesterAuthDisplayMessageIsSanitizedAndSpecific() {
        XCTAssertEqual(testerAuthDisplayMessage(for: NativeSupabaseAuthClientError.missingTesterPassword), testerAuthConfigError)
        XCTAssertEqual(testerAuthDisplayMessage(for: NativeSupabaseAuthClientError.httpStatus(400)), testerAuthInvalidCredentialsError)
        XCTAssertEqual(testerAuthDisplayMessage(for: NativeSupabaseAuthClientError.httpStatus(500)), testerAuthNetworkError)
        XCTAssertEqual(testerAuthDisplayMessage(for: NativeSupabaseAuthClientError.blankAccessToken), testerAuthResponseError)
        XCTAssertEqual(testerAuthDisplayMessage(for: NativeKeyValueStoreError.keychainSetFailed(errSecInteractionNotAllowed)), testerAuthSessionStorageError)
        XCTAssertEqual(testerAuthDisplayMessage(for: DecodingError.dataCorrupted(.init(codingPath: [], debugDescription: "bad"))), testerAuthResponseError)
    }

    func testDevTesterModeMatchesSharedContract() {
        let auth = TesterAuth()

        XCTAssertEqual(auth.resolveDevTesterMode(testerId: " pws_dev "), .figmaParity)
        XCTAssertTrue(auth.isFigmaParitySessionId("dev-pws_dev"))
        XCTAssertEqual(auth.resolveDevTesterMode(testerId: "pws_onboard"), .onboardingQA)
        XCTAssertEqual(auth.resolveDevTesterMode(testerId: "someone"), .simpleLogin)
        XCTAssertNil(auth.resolveDevTesterMode(testerId: "   "))
    }

    func testSupabaseSessionPersistenceAndClearingMatchSharedContract() throws {
        let keyValueStore = InMemoryNativeKeyValueStore()
        let store = NativeSupabaseSessionStore(keyValueStore: keyValueStore)

        try store.save(NativeSupabaseSession(
            accessToken: " access-token ",
            refreshToken: " refresh-token ",
            expiresAtEpochSeconds: 1_000,
            userId: " user-1 ",
            userEmail: " smoke_primary@test.pws "
        ))

        XCTAssertEqual(store.load(), NativeSupabaseSession(
            accessToken: "access-token",
            refreshToken: "refresh-token",
            expiresAtEpochSeconds: 1_000,
            userId: "user-1",
            userEmail: "smoke_primary@test.pws"
        ))
        XCTAssertEqual(store.validAccessToken(nowEpochSeconds: 900), "access-token")
        XCTAssertNil(store.validAccessToken(nowEpochSeconds: 941))

        try store.clear()

        XCTAssertNil(store.load())
        XCTAssertNil(keyValueStore.string(forKey: NativeSupabaseSessionStore.accessTokenKey))
        XCTAssertNil(keyValueStore.string(forKey: NativeSupabaseSessionStore.refreshTokenKey))
        XCTAssertNil(keyValueStore.string(forKey: NativeSupabaseSessionStore.expiresAtKey))
        XCTAssertNil(keyValueStore.string(forKey: NativeSupabaseSessionStore.userIdKey))
        XCTAssertNil(keyValueStore.string(forKey: NativeSupabaseSessionStore.userEmailKey))
    }

    func testSupabaseSessionRejectsBlankAccessToken() {
        let store = NativeSupabaseSessionStore(keyValueStore: InMemoryNativeKeyValueStore())

        XCTAssertThrowsError(try store.save(NativeSupabaseSession(
            accessToken: " ",
            refreshToken: nil,
            expiresAtEpochSeconds: nil,
            userId: nil
        ))) { error in
            XCTAssertEqual(error as? NativeSupabaseSessionError, .blankAccessToken)
        }
    }

    func testKeychainStorePersistsAndClearsSessionValues() throws {
        let keyValueStore = KeychainNativeKeyValueStore(
            service: "woos.owndo.tests.\(UUID().uuidString)"
        )
        let store = NativeSupabaseSessionStore(keyValueStore: keyValueStore)
        defer { try? store.clear() }

        try store.save(NativeSupabaseSession(
            accessToken: "secure-access",
            refreshToken: "secure-refresh",
            expiresAtEpochSeconds: 2_000,
            userId: "user-secure",
            userEmail: "secure@test.pws"
        ))

        XCTAssertEqual(store.load(), NativeSupabaseSession(
            accessToken: "secure-access",
            refreshToken: "secure-refresh",
            expiresAtEpochSeconds: 2_000,
            userId: "user-secure",
            userEmail: "secure@test.pws"
        ))

        try store.clear()

        XCTAssertNil(store.load())
    }

    func testKeychainStoreOverwritesExistingSessionValues() throws {
        let keyValueStore = KeychainNativeKeyValueStore(
            service: "woos.owndo.tests.\(UUID().uuidString)"
        )
        let store = NativeSupabaseSessionStore(keyValueStore: keyValueStore)
        defer { try? store.clear() }

        try store.save(NativeSupabaseSession(
            accessToken: "first-access",
            refreshToken: "first-refresh",
            expiresAtEpochSeconds: 2_000,
            userId: "first-user",
            userEmail: "first@test.pws"
        ))
        try store.save(NativeSupabaseSession(
            accessToken: "second-access",
            refreshToken: "second-refresh",
            expiresAtEpochSeconds: 3_000,
            userId: "second-user",
            userEmail: "second@test.pws"
        ))

        XCTAssertEqual(store.load(), NativeSupabaseSession(
            accessToken: "second-access",
            refreshToken: "second-refresh",
            expiresAtEpochSeconds: 3_000,
            userId: "second-user",
            userEmail: "second@test.pws"
        ))
    }

    func testSupabaseSessionPropagatesKeyValueStoreWriteFailures() {
        let store = NativeSupabaseSessionStore(keyValueStore: FailingNativeKeyValueStore(failSet: true))

        XCTAssertThrowsError(try store.save(NativeSupabaseSession(
            accessToken: "secure-access",
            refreshToken: nil,
            expiresAtEpochSeconds: nil,
            userId: nil
        ))) { error in
            XCTAssertEqual(error as? NativeKeyValueStoreError, .keychainSetFailed(errSecInteractionNotAllowed))
        }
    }

    func testSupabaseSessionPropagatesKeyValueStoreClearFailures() {
        let store = NativeSupabaseSessionStore(keyValueStore: FailingNativeKeyValueStore(failRemove: true))

        XCTAssertThrowsError(try store.clear()) { error in
            XCTAssertEqual(error as? NativeKeyValueStoreError, .keychainRemoveFailed(errSecInteractionNotAllowed))
        }
    }

    func testAuthClientSignsInWithPasswordAndPersistsBearerSession() async throws {
        let transport = RecordingAuthTransport(response: NativeHTTPResponse(
            statusCode: 200,
            data: Data("""
            {
              "access_token":"remote-access",
              "refresh_token":"remote-refresh",
              "expires_in":3600,
              "user":{"id":"user-1","email":"pws_dev@test.pws"}
            }
            """.utf8)
        ))
        let sessionStore = NativeSupabaseSessionStore(keyValueStore: InMemoryNativeKeyValueStore())
        let client = NativeSupabaseAuthClient(
            config: PWSConfig(supabaseURL: "https://project.supabase.co/", supabaseAnonKey: "anon-key", testerPassword: ""),
            sessionStore: sessionStore,
            transport: transport,
            nowEpochSeconds: { 1_000 }
        )

        let session = try await client.signInWithPassword(email: " pws_dev@test.pws ", password: " secret ")

        XCTAssertEqual(session.accessToken, "remote-access")
        XCTAssertEqual(session.refreshToken, "remote-refresh")
        XCTAssertEqual(session.expiresAtEpochSeconds, 4_600)
        XCTAssertEqual(session.userId, "user-1")
        XCTAssertEqual(session.userEmail, "pws_dev@test.pws")
        XCTAssertEqual(sessionStore.load(), session)
        XCTAssertEqual(transport.requests.first?.httpMethod, "POST")
        XCTAssertEqual(transport.requests.first?.url?.absoluteString, "https://project.supabase.co/auth/v1/token?grant_type=password")
        XCTAssertEqual(transport.requests.first?.value(forHTTPHeaderField: "apikey"), "anon-key")
        XCTAssertEqual(String(data: transport.requests.first?.httpBody ?? Data(), encoding: .utf8), #"{"email":"pws_dev@test.pws","password":"secret"}"#)
    }

    func testAuthClientRejectsMissingTesterPasswordBeforeNetwork() async throws {
        let transport = RecordingAuthTransport(response: NativeHTTPResponse(statusCode: 200, data: Data()))
        let client = NativeSupabaseAuthClient(
            config: PWSConfig(supabaseURL: "https://project.supabase.co", supabaseAnonKey: "anon-key", testerPassword: ""),
            sessionStore: NativeSupabaseSessionStore(keyValueStore: InMemoryNativeKeyValueStore()),
            transport: transport
        )

        do {
            _ = try await client.signInTester(testerId: "pws_dev")
            XCTFail("Expected missing tester password")
        } catch {
            XCTAssertEqual(error as? NativeSupabaseAuthClientError, .missingTesterPassword)
        }

        XCTAssertTrue(transport.requests.isEmpty)
    }

    func testAuthClientRejectsMissingPublicConfigBeforeNetwork() async throws {
        let transport = RecordingAuthTransport(response: NativeHTTPResponse(statusCode: 200, data: Data()))

        do {
            _ = try await NativeSupabaseAuthClient(
                config: PWSConfig(supabaseURL: " ", supabaseAnonKey: "anon-key", testerPassword: ""),
                sessionStore: NativeSupabaseSessionStore(keyValueStore: InMemoryNativeKeyValueStore()),
                transport: transport
            ).signInWithPassword(email: "user@test.pws", password: "secret")
            XCTFail("Expected missing Supabase URL")
        } catch {
            XCTAssertEqual(error as? NativeSupabaseAuthClientError, .missingSupabaseURL)
        }

        do {
            _ = try await NativeSupabaseAuthClient(
                config: PWSConfig(supabaseURL: "https://project.supabase.co", supabaseAnonKey: " ", testerPassword: ""),
                sessionStore: NativeSupabaseSessionStore(keyValueStore: InMemoryNativeKeyValueStore()),
                transport: transport
            ).signInWithPassword(email: "user@test.pws", password: "secret")
            XCTFail("Expected missing anon key")
        } catch {
            XCTAssertEqual(error as? NativeSupabaseAuthClientError, .missingAnonKey)
        }

        XCTAssertTrue(transport.requests.isEmpty)
    }

    func testPwsSessionCanRepresentRestoredRemoteSupabaseSession() {
        let session = PWSSession(
            remoteSession: NativeSupabaseSession(
                accessToken: "remote-access",
                refreshToken: nil,
                expiresAtEpochSeconds: 2_000,
                userId: "user-1"
            ),
            fallbackTesterId: " pws_dev ",
            testerAuth: TesterAuth()
        )

        XCTAssertEqual(session.testerId, "pws_dev")
        XCTAssertEqual(session.testerEmail, "pws_dev@test.pws")
        XCTAssertEqual(session.localSessionId, "user-1")
    }

    func testPwsSessionRestoresTesterIdentityFromStoredRemoteEmail() {
        let session = PWSSession(
            restoredRemoteSession: NativeSupabaseSession(
                accessToken: "remote-access",
                refreshToken: nil,
                expiresAtEpochSeconds: 2_000,
                userId: "user-1",
                userEmail: "smoke_primary@test.pws"
            ),
            fallbackTesterId: "pws_dev",
            testerAuth: TesterAuth()
        )

        XCTAssertEqual(session.testerId, "smoke_primary")
        XCTAssertEqual(session.testerEmail, "smoke_primary@test.pws")
        XCTAssertEqual(session.displayName, "smoke_primary")
        XCTAssertEqual(session.localSessionId, "user-1")
    }

    func testAccountDeletionClientCallsDeleteOwnAccountRpcWithSession() async throws {
        let sessionStore = NativeSupabaseSessionStore(keyValueStore: InMemoryNativeKeyValueStore())
        try sessionStore.save(NativeSupabaseSession(
            accessToken: "remote-access",
            refreshToken: nil,
            expiresAtEpochSeconds: 2_000,
            userId: "user-1"
        ))
        let transport = RecordingAuthTransport(response: NativeHTTPResponse(statusCode: 204, data: Data()))
        let client = NativeSupabaseAccountDeletionClient(
            config: PWSConfig(supabaseURL: "https://project.supabase.co/", supabaseAnonKey: "anon-key", testerPassword: ""),
            sessionStore: sessionStore,
            transport: transport,
            nowEpochSeconds: { 1_000 }
        )

        try await client.deleteOwnAccount()

        XCTAssertEqual(transport.requests.single?.httpMethod, "POST")
        XCTAssertEqual(transport.requests.single?.url?.absoluteString, "https://project.supabase.co/rest/v1/rpc/delete_own_account")
        XCTAssertEqual(transport.requests.single?.value(forHTTPHeaderField: "apikey"), "anon-key")
        XCTAssertEqual(transport.requests.single?.value(forHTTPHeaderField: "Authorization"), "Bearer remote-access")
        XCTAssertEqual(String(data: transport.requests.single?.httpBody ?? Data(), encoding: .utf8), "{}")
    }

    func testAccountDeletionClientRequiresUsableSession() async throws {
        let transport = RecordingAuthTransport(response: NativeHTTPResponse(statusCode: 204, data: Data()))
        let client = NativeSupabaseAccountDeletionClient(
            config: PWSConfig(supabaseURL: "https://project.supabase.co/", supabaseAnonKey: "anon-key", testerPassword: ""),
            sessionStore: NativeSupabaseSessionStore(keyValueStore: InMemoryNativeKeyValueStore()),
            transport: transport
        )

        do {
            try await client.deleteOwnAccount()
            XCTFail("Expected missing session")
        } catch {
            XCTAssertEqual(error as? NativeSupabaseAccountDeletionError, .missingUsableSession)
        }

        XCTAssertTrue(transport.requests.isEmpty)
    }
}

private extension Array {
    var single: Element? {
        count == 1 ? first : nil
    }
}

private final class RecordingAuthTransport: NativeHTTPTransport {
    private(set) var requests: [URLRequest] = []
    let response: NativeHTTPResponse

    init(response: NativeHTTPResponse) {
        self.response = response
    }

    func data(for request: URLRequest) async throws -> NativeHTTPResponse {
        requests.append(request)
        return response
    }
}

private final class FailingNativeKeyValueStore: NativeKeyValueStore {
    private let failSet: Bool
    private let failRemove: Bool

    init(failSet: Bool = false, failRemove: Bool = false) {
        self.failSet = failSet
        self.failRemove = failRemove
    }

    func string(forKey key: String) -> String? {
        nil
    }

    func setString(_ value: String, forKey key: String) throws {
        if failSet {
            throw NativeKeyValueStoreError.keychainSetFailed(errSecInteractionNotAllowed)
        }
    }

    func removeValue(forKey key: String) throws {
        if failRemove {
            throw NativeKeyValueStoreError.keychainRemoveFailed(errSecInteractionNotAllowed)
        }
    }
}
