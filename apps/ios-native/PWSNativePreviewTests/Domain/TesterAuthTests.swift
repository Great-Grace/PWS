import XCTest
@testable import PWSNativePreview

final class TesterAuthTests: XCTestCase {
    func testTesterIdentityMatchesSharedAuthContract() {
        let auth = TesterAuth()

        XCTAssertEqual(auth.normalizedTesterId(" TaeWoo "), "taewoo")
        XCTAssertEqual(auth.testerEmail(for: " TaeWoo "), "taewoo@test.pws")
        XCTAssertEqual(auth.localSessionId(for: " TaeWoo "), "local-tester-taewoo")
    }
}

