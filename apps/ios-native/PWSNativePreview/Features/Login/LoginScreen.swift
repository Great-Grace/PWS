import SwiftUI

struct LoginScreen: View {
    let environment: AppEnvironment
    let isLoading: Bool
    let errorMessage: String?
    let onLogin: (String, String) -> Void
    @State private var email = ""
    @State private var password = ""
    @FocusState private var focusedField: LoginField?

    private var normalizedEmail: String {
        email.trimmingCharacters(in: .whitespacesAndNewlines).lowercased()
    }

    private var canSubmit: Bool {
        !normalizedEmail.isEmpty && !password.isEmpty && !isLoading
    }

    var body: some View {
        ScrollView {
            VStack(spacing: 0) {
                Spacer(minLength: PWSTokens.spacing32)
                VStack(alignment: .leading, spacing: PWSTokens.spacing24) {
                    VStack(alignment: .leading, spacing: PWSTokens.spacing12) {
                        Text("날씨 체감 기록")
                            .font(.system(size: 40, weight: .semibold, design: .default))
                            .foregroundStyle(PWSTokens.primaryText)
                            .minimumScaleFactor(0.75)
                            .accessibilityAddTraits(.isHeader)
                        Text("오늘의 날씨, 나만의 체감으로 기록하세요")
                            .font(.body)
                            .foregroundStyle(PWSTokens.secondaryText)
                            .lineSpacing(2)
                    }

                    PWSCard {
                        VStack(alignment: .leading, spacing: PWSTokens.spacing8) {
                            Text("테스터 계정 로그인")
                                .font(.system(.title3, design: .default, weight: .semibold))
                                .foregroundStyle(PWSTokens.primaryText)
                            Text("관리자가 발급한 TestFlight 계정으로 로그인하세요. 소셜 로그인은 현재 빌드에서 제공하지 않습니다.")
                                .font(.callout)
                                .foregroundStyle(PWSTokens.secondaryText)
                                .fixedSize(horizontal: false, vertical: true)
                        }

                        TextField("pws_tf_01@test.pws", text: $email)
                            .keyboardType(.emailAddress)
                            .textContentType(.username)
                            .textInputAutocapitalization(.never)
                            .autocorrectionDisabled()
                            .focused($focusedField, equals: .email)
                            .font(.body)
                            .padding(.horizontal, PWSTokens.spacing17)
                            .frame(minHeight: 52)
                            .background(PWSTokens.secondaryPanelBackground)
                            .clipShape(RoundedRectangle(cornerRadius: PWSTokens.compactRadius, style: .continuous))
                            .overlay {
                                RoundedRectangle(cornerRadius: PWSTokens.compactRadius, style: .continuous)
                                    .stroke(focusedField == .email ? PWSTokens.actionBlue : PWSTokens.border, lineWidth: 1)
                            }
                            .accessibilityLabel("테스터 이메일")
                            .accessibilityHint("관리자가 발급한 이메일 계정을 입력하세요")

                        SecureField("비밀번호", text: $password)
                            .textContentType(.password)
                            .focused($focusedField, equals: .password)
                            .font(.body)
                            .padding(.horizontal, PWSTokens.spacing17)
                            .frame(minHeight: 52)
                            .background(PWSTokens.secondaryPanelBackground)
                            .clipShape(RoundedRectangle(cornerRadius: PWSTokens.compactRadius, style: .continuous))
                            .overlay {
                                RoundedRectangle(cornerRadius: PWSTokens.compactRadius, style: .continuous)
                                    .stroke(focusedField == .password ? PWSTokens.actionBlue : PWSTokens.border, lineWidth: 1)
                            }
                            .accessibilityLabel("비밀번호")

                        if !normalizedEmail.isEmpty {
                            Text(normalizedEmail)
                                .font(.caption)
                                .foregroundStyle(PWSTokens.tertiaryText)
                                .lineLimit(1)
                                .minimumScaleFactor(0.75)
                        }

                        if let errorMessage, !errorMessage.isEmpty {
                            PWSStatusBanner(
                                title: "로그인 실패",
                                message: errorMessage,
                                kind: .warning
                            )
                        }

                        PWSPrimaryButton(isLoading ? "로그인 중..." : "이메일로 로그인", systemImage: isLoading ? nil : "person.crop.circle") {
                            focusedField = nil
                            onLogin(normalizedEmail, password)
                        }
                        .accessibilityLabel("이메일로 로그인")
                        .accessibilityHint("테스터 이메일과 비밀번호로 로그인합니다")
                        .disabled(!canSubmit)
                    }

                    PWSStatusBanner(
                        title: "개인 정보 보호",
                        message: "이 미리보기는 토큰이나 비밀번호를 화면에 표시하지 않습니다.",
                        kind: .info
                    )
                }
                .padding(.horizontal, PWSTokens.spacing24)
                .frame(maxWidth: .infinity, alignment: .leading)
                Spacer(minLength: PWSTokens.spacing48)
            }
        }
        .scrollDismissesKeyboard(.interactively)
        .background(PWSTokens.pageBackground.ignoresSafeArea())
        .safeAreaInset(edge: .bottom) {
            Text("PWS Native Preview")
                .font(.caption)
                .foregroundStyle(PWSTokens.tertiaryText)
                .padding(.bottom, PWSTokens.spacing17)
        }
    }
}

private enum LoginField {
    case email
    case password
}
