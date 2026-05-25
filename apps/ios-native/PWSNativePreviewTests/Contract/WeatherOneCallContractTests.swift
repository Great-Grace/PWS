import XCTest
@testable import PWSNativePreview

final class WeatherOneCallContractTests: XCTestCase {
    func testEndpointAndRequestShapeMatchSharedContract() throws {
        let contract = WeatherOneCallContract()

        let endpoint = try contract.endpoint(supabaseURL: "https://project.supabase.co/")
        let body = String(data: contract.requestBody(latitude: 37.5665, longitude: 126.978), encoding: .utf8)

        XCTAssertEqual(endpoint.absoluteString, "https://project.supabase.co/functions/v1/weather-onecall")
        XCTAssertEqual(body, #"{"lat":37.566500,"lng":126.978000}"#)
    }

    func testHeadersMatchNativeIOSContract() throws {
        let headers = try WeatherOneCallContract().headers(anonKey: " anon-key ", accessToken: " access-token ")

        XCTAssertEqual(headers["Content-Type"], "application/json")
        XCTAssertEqual(headers["Accept"], "application/json")
        XCTAssertEqual(headers["apikey"], "anon-key")
        XCTAssertEqual(headers["Authorization"], "Bearer access-token")
        XCTAssertEqual(headers["x-client-info"], "pws-native-ios")
    }

    func testURLRequestAndCoordinateValidationMatchEdgeFunctionContract() throws {
        let request = try WeatherOneCallContract().urlRequest(
            supabaseURL: "https://project.supabase.co",
            anonKey: "anon-key",
            accessToken: "access-token",
            latitude: 37.5665,
            longitude: 126.978
        )

        XCTAssertEqual(request.url?.absoluteString, "https://project.supabase.co/functions/v1/weather-onecall")
        XCTAssertEqual(request.httpMethod, "POST")
        XCTAssertEqual(String(data: request.httpBody ?? Data(), encoding: .utf8), #"{"lat":37.566500,"lng":126.978000}"#)
        XCTAssertEqual(request.value(forHTTPHeaderField: "Authorization"), "Bearer access-token")

        XCTAssertThrowsError(try WeatherOneCallContract().urlRequest(
            supabaseURL: "https://project.supabase.co",
            anonKey: "anon-key",
            accessToken: "access-token",
            latitude: 91,
            longitude: 126.978
        )) { error in
            XCTAssertEqual(error as? ContractError, .invalidCoordinates)
        }
    }

    func testWeatherCacheTTLMatchesThirtyMinuteSharedContract() {
        let contract = WeatherOneCallContract()
        let fetchedAt = Date(timeIntervalSince1970: 1_000)

        XCTAssertTrue(contract.shouldUseCache(
            cachedLatitude: 37.5665,
            cachedLongitude: 126.978,
            fetchedAt: fetchedAt,
            latitude: 37.5665,
            longitude: 126.978,
            now: Date(timeIntervalSince1970: 2_799)
        ))
        XCTAssertFalse(contract.shouldUseCache(
            cachedLatitude: 37.5665,
            cachedLongitude: 126.978,
            fetchedAt: fetchedAt,
            latitude: 37.5665,
            longitude: 126.978,
            now: Date(timeIntervalSince1970: 2_800)
        ))
        XCTAssertFalse(contract.shouldUseCache(
            cachedLatitude: 37.5665,
            cachedLongitude: 126.978,
            fetchedAt: fetchedAt,
            latitude: 37.5,
            longitude: 126.978,
            now: Date(timeIntervalSince1970: 2_000)
        ))
        XCTAssertFalse(contract.shouldUseCache(
            cachedLatitude: 37.5665,
            cachedLongitude: 126.978,
            fetchedAt: fetchedAt,
            latitude: 37.5665,
            longitude: 126.978,
            now: Date(timeIntervalSince1970: 2_000),
            force: true
        ))
    }

    func testWeatherClientFetchesEdgeFunctionWithBearerSession() async throws {
        let response = """
        {
          "current": {
            "temp": 21.4,
            "feels_like": 20.8,
            "humidity": 45,
            "wind_speed": 2.1,
            "weather_code": 800,
            "weather_desc": "맑음",
            "uv_index": 7.5,
            "precipitation_1h": 0,
            "tmrt_api": 31.2
          },
          "hourly": [],
          "daily": [{
            "dt": 1778947200,
            "temp_min": 17.2,
            "temp_max": 24.5,
            "humidity": 48,
            "wind_speed": 2.8,
            "weather_code": 800,
            "weather_desc": "맑음",
            "pop": 0.1,
            "uv_index": 7.5
          }],
          "fetchedAt": 1778947200000
        }
        """
        let transport = RecordingWeatherTransport(response: NativeHTTPResponse(statusCode: 200, data: Data(response.utf8)))
        let sessionStore = NativeSupabaseSessionStore(keyValueStore: InMemoryNativeKeyValueStore())
        try sessionStore.save(NativeSupabaseSession(
            accessToken: "weather-token",
            refreshToken: "refresh-token",
            expiresAtEpochSeconds: 4_000,
            userId: "user-1"
        ))
        let client = NativeSupabaseWeatherClient(
            config: PWSConfig(supabaseURL: "https://project.supabase.co/", supabaseAnonKey: "anon-key", testerPassword: "secret"),
            sessionStore: sessionStore,
            transport: transport,
            nowEpochSeconds: { 1_000 }
        )

        let weather = try await client.fetchWeather(latitude: 37.5665, longitude: 126.9780)

        let request = try XCTUnwrap(transport.requests.single)
        XCTAssertEqual(request.url?.absoluteString, "https://project.supabase.co/functions/v1/weather-onecall")
        XCTAssertEqual(request.httpMethod, "POST")
        XCTAssertEqual(request.value(forHTTPHeaderField: "apikey"), "anon-key")
        XCTAssertEqual(request.value(forHTTPHeaderField: "Authorization"), "Bearer weather-token")
        XCTAssertEqual(String(data: request.httpBody ?? Data(), encoding: .utf8), #"{"lat":37.566500,"lng":126.978000}"#)
        XCTAssertEqual(weather.current.temp, 21.4)
        XCTAssertEqual(weather.current.feelsLike, 20.8)
        XCTAssertEqual(weather.daily.first?.weatherIcon, "")
        XCTAssertEqual(weather.fetchedAt, 1_778_947_200_000)
    }
}

private final class RecordingWeatherTransport: NativeHTTPTransport {
    private let response: NativeHTTPResponse
    private(set) var requests: [URLRequest] = []

    init(response: NativeHTTPResponse) {
        self.response = response
    }

    func data(for request: URLRequest) async throws -> NativeHTTPResponse {
        requests.append(request)
        return response
    }
}

private extension Array {
    var single: Element? {
        count == 1 ? first : nil
    }
}
