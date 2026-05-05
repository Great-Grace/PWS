import Foundation

struct TesterAuth {
    func normalizedTesterId(_ rawValue: String) -> String {
        rawValue.trimmingCharacters(in: .whitespacesAndNewlines).lowercased()
    }

    func testerEmail(for rawTesterId: String) -> String {
        "\(normalizedTesterId(rawTesterId))@test.pws"
    }

    func localSessionId(for rawTesterId: String) -> String {
        "local-tester-\(normalizedTesterId(rawTesterId))"
    }
}

