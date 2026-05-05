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
}

