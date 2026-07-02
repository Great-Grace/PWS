import Foundation

let testerAuthConfigError = "테스터 로그인 설정이 비어 있습니다. 관리자에게 문의해주세요."
let testerAuthInvalidCredentialsError = "테스터 ID 또는 비밀번호가 올바르지 않습니다."
let testerAuthNetworkError = "로그인 서버에 연결하지 못했습니다. 네트워크를 확인한 뒤 다시 시도해주세요."
let testerAuthResponseError = "로그인 응답을 확인하지 못했습니다. 잠시 후 다시 시도해주세요."
let testerAuthSessionStorageError = "로그인 세션을 안전하게 저장하지 못했습니다. 앱을 다시 실행한 뒤 시도해주세요."

struct TesterAuthConfig: Equatable {
    let password: String
    let allowAutoSignup: Bool
}

enum DevTesterMode: Equatable {
    case figmaParity
    case onboardingQA
    case simpleLogin
}

struct TesterAuth {
    static let localTesterSessionPrefix = "dev-"
    static let figmaParityTesterId = "pws_dev"
    static let onboardingQATesterId = "pws_onboard"

    func resolveTesterAuthConfig(rawPassword: String?) throws -> TesterAuthConfig {
        guard let config = resolveOptionalTesterAuthConfig(rawPassword: rawPassword) else {
            throw TesterAuthError.missingPassword
        }
        return config
    }

    func resolveOptionalTesterAuthConfig(rawPassword: String?) -> TesterAuthConfig? {
        let password = rawPassword?.trimmingCharacters(in: .whitespacesAndNewlines) ?? ""
        guard !password.isEmpty else { return nil }
        return TesterAuthConfig(password: password, allowAutoSignup: false)
    }

    func normalizedTesterId(_ rawValue: String) -> String {
        rawValue.trimmingCharacters(in: .whitespacesAndNewlines).lowercased()
    }

    func testerEmail(for rawTesterId: String) -> String {
        "\(normalizedTesterId(rawTesterId))@test.pws"
    }

    func testerId(fromEmail rawEmail: String?) -> String? {
        let email = rawEmail?.trimmingCharacters(in: .whitespacesAndNewlines).lowercased() ?? ""
        guard email.hasSuffix("@test.pws") else { return nil }
        let id = String(email.dropLast("@test.pws".count))
        return id.isEmpty ? nil : id
    }

    func localSessionId(for rawTesterId: String) -> String {
        "\(Self.localTesterSessionPrefix)\(normalizedTesterId(rawTesterId))"
    }

    func isLocalTesterSessionId(_ userId: String?) -> Bool {
        userId?.hasPrefix(Self.localTesterSessionPrefix) == true
    }

    func isFigmaParitySessionId(_ userId: String?) -> Bool {
        userId == localSessionId(for: Self.figmaParityTesterId)
    }

    func resolveDevTesterMode(testerId: String) -> DevTesterMode? {
        let normalized = normalizedTesterId(testerId)
        guard !normalized.isEmpty else { return nil }
        if normalized == Self.figmaParityTesterId { return .figmaParity }
        if normalized == Self.onboardingQATesterId { return .onboardingQA }
        return .simpleLogin
    }
}

enum TesterAuthError: Error, Equatable {
    case missingPassword
}

func testerAuthDisplayMessage(for error: Error) -> String {
    if let authError = error as? NativeSupabaseAuthClientError {
        switch authError {
        case .missingSupabaseURL, .missingAnonKey, .missingTesterPassword:
            return testerAuthConfigError
        case .missingEmail, .missingPassword, .blankAccessToken:
            return testerAuthResponseError
        case .httpStatus(400), .httpStatus(401), .httpStatus(403):
            return testerAuthInvalidCredentialsError
        case .httpStatus:
            return testerAuthNetworkError
        }
    }

    if error is NativeKeyValueStoreError {
        return testerAuthSessionStorageError
    }

    if error is DecodingError {
        return testerAuthResponseError
    }

    return testerAuthNetworkError
}
