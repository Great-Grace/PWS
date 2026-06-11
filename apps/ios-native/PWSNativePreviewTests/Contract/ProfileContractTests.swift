import XCTest
@testable import PWSNativePreview

final class ProfileContractTests: XCTestCase {
    func testProfileURLsAndHeadersMatchSharedContract() throws {
        let contract = ProfileContract()

        XCTAssertEqual(
            try contract.fetchURL(supabaseURL: "https://project.supabase.co/", userId: "user-1").absoluteString,
            "https://project.supabase.co/rest/v1/users?id=eq.user-1&select=*"
        )
        XCTAssertEqual(
            try contract.upsertURL(supabaseURL: "https://project.supabase.co/").absoluteString,
            "https://project.supabase.co/rest/v1/users?on_conflict=id"
        )
        XCTAssertEqual(
            try contract.updateURL(supabaseURL: "https://project.supabase.co/", userId: "user-1").absoluteString,
            "https://project.supabase.co/rest/v1/users?id=eq.user-1"
        )

        let headers = try contract.headers(
            anonKey: " anon-key ",
            accessToken: " access-token ",
            prefer: "resolution=merge-duplicates,return=representation"
        )

        XCTAssertEqual(headers["Content-Type"], "application/json")
        XCTAssertEqual(headers["Accept"], "application/json")
        XCTAssertEqual(headers["apikey"], "anon-key")
        XCTAssertEqual(headers["Authorization"], "Bearer access-token")
        XCTAssertEqual(headers["x-client-info"], "pws-native-ios")
        XCTAssertEqual(headers["Prefer"], "resolution=merge-duplicates,return=representation")
    }

    func testProfileBodiesUseRemoteColumnNames() throws {
        let contract = ProfileContract()

        let onboarding = try jsonObject(contract.onboardingBody(NativeUserOnboardingUpsert(
            id: "user-1",
            email: "pws_dev@test.pws",
            nickname: "지우진",
            defaultLatitude: 37.5665,
            defaultLongitude: 126.978,
            climateZone: "서울특별시 강남구",
            birthYear: 1994,
            gender: .male
        )))

        XCTAssertEqual(onboarding["id"] as? String, "user-1")
        XCTAssertEqual(onboarding["email"] as? String, "pws_dev@test.pws")
        XCTAssertEqual(onboarding["nickname"] as? String, "지우진")
        XCTAssertEqual(onboarding["default_lat"] as? Double, 37.5665)
        XCTAssertEqual(onboarding["default_lng"] as? Double, 126.978)
        XCTAssertEqual(onboarding["climate_zone"] as? String, "서울특별시 강남구")
        XCTAssertEqual(onboarding["onboarding_done"] as? Bool, true)
        XCTAssertEqual(onboarding["birth_year"] as? Int, 1994)
        XCTAssertEqual(onboarding["gender"] as? String, "M")

        let update = try jsonObject(contract.updateBody(NativeUserProfileUpdate(
            nickname: "새 이름",
            notifyEnabled: false,
            notifyOutfit: true,
            notifyRain: false
        )))

        XCTAssertEqual(update["nickname"] as? String, "새 이름")
        XCTAssertEqual(update["notify_enabled"] as? Bool, false)
        XCTAssertEqual(update["notify_outfit"] as? Bool, true)
        XCTAssertEqual(update["notify_rain"] as? Bool, false)
        XCTAssertNil(update["default_lat"])
    }

    func testProfileRecordSplitsClimateZoneForNativeUI() {
        let record = NativeUserProfileRecord(
            id: "user-1",
            email: "pws_dev@test.pws",
            nickname: "지우진",
            defaultLatitude: nil,
            defaultLongitude: nil,
            climateZone: "서울특별시 강남구",
            onboardingDone: true,
            birthYear: 1994,
            gender: .male,
            notifyEnabled: true,
            notifyOutfit: true,
            notifyRain: true
        )

        XCTAssertEqual(record.regionParts.province, "서울특별시")
        XCTAssertEqual(record.regionParts.district, "강남구")
    }

    func testProfileClientFetchesFirstRemoteProfileWithBearerSession() async throws {
        let transport = RecordingProfileTransport(
            response: NativeHTTPResponse(
                statusCode: 200,
                data: Data("""
                [{
                  "id":"user-1",
                  "email":"pws_dev@test.pws",
                  "nickname":"지우진",
                  "default_lat":37.5665,
                  "default_lng":126.978,
                  "climate_zone":"서울특별시 강남구",
                  "onboarding_done":true,
                  "birth_year":1994,
                  "gender":"M",
                  "notify_enabled":true,
                  "notify_outfit":false,
                  "notify_rain":true
                }]
                """.utf8)
            )
        )
        let sessionStore = NativeSupabaseSessionStore(keyValueStore: InMemoryNativeKeyValueStore())
        try sessionStore.save(NativeSupabaseSession(
            accessToken: "access-token",
            refreshToken: nil,
            expiresAtEpochSeconds: nil,
            userId: "user-1"
        ))
        let client = NativeSupabaseProfileClient(
            config: PWSConfig(supabaseURL: "https://project.supabase.co", supabaseAnonKey: "anon-key", testerPassword: ""),
            sessionStore: sessionStore,
            transport: transport
        )

        let profile = try await client.fetchProfile(userId: "user-1")

        XCTAssertEqual(profile?.id, "user-1")
        XCTAssertEqual(profile?.nickname, "지우진")
        XCTAssertEqual(profile?.notifyOutfit, false)
        XCTAssertEqual(transport.requests.first?.httpMethod, "GET")
        XCTAssertEqual(transport.requests.first?.value(forHTTPHeaderField: "Authorization"), "Bearer access-token")
        XCTAssertEqual(transport.requests.first?.url?.absoluteString, "https://project.supabase.co/rest/v1/users?id=eq.user-1&select=*")
    }

    func testProfileClientRejectsMissingUsableSessionBeforeNetwork() async throws {
        let transport = RecordingProfileTransport(response: NativeHTTPResponse(statusCode: 200, data: Data()))
        let client = NativeSupabaseProfileClient(
            config: PWSConfig(supabaseURL: "https://project.supabase.co", supabaseAnonKey: "anon-key", testerPassword: ""),
            sessionStore: NativeSupabaseSessionStore(keyValueStore: InMemoryNativeKeyValueStore()),
            transport: transport
        )

        do {
            _ = try await client.fetchProfile(userId: "user-1")
            XCTFail("Expected missing session failure")
        } catch {
            XCTAssertEqual(error as? NativeSupabaseProfileClientError, .missingUsableSession)
        }

        XCTAssertTrue(transport.requests.isEmpty)
    }

    private func jsonObject(_ data: Data) throws -> [String: Any] {
        try XCTUnwrap(JSONSerialization.jsonObject(with: data) as? [String: Any])
    }
}

private final class RecordingProfileTransport: NativeHTTPTransport {
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
