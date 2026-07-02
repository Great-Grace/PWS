import SwiftUI

struct LoginScreen: View {
    let environment: AppEnvironment
    let isLoading: Bool
    let errorMessage: String?
    let onLogin: (String, String) -> Void
    @State private var email = ""
    @State private var password = ""
    @State private var showPassword = false
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
                // MARK: - 상단 로고
                VStack(spacing: PWSTokens.spacing12) {
                    Image(systemName: "cloud.sun.rain.fill")
                        .font(.system(size: 48))
                        .foregroundStyle(PWSTokens.actionBlue)

                    Text("PWS")
                        .font(.system(size: 32, weight: .bold, design: .rounded))
                        .foregroundStyle(PWSTokens.primaryText)

                    Text("나만의 체감 날씨")
                        .font(.system(size: 16, weight: .medium))
                        .foregroundStyle(PWSTokens.tertiaryText)
                }
                .padding(.top, 60)
                .padding(.bottom, 40)

                // MARK: - 입력 필드
                VStack(spacing: PWSTokens.spacing16) {
                    // 이메일
                    HStack(spacing: PWSTokens.spacing12) {
                        Image(systemName: "envelope")
                            .font(.system(size: 16))
                            .foregroundStyle(PWSTokens.mutedText)
                            .frame(width: 20)
                        TextField("이메일", text: $email)
                            .keyboardType(.emailAddress)
                            .textContentType(.username)
                            .textInputAutocapitalization(.never)
                            .autocorrectionDisabled()
                            .focused($focusedField, equals: .email)
                            .font(.body)
                    }
                    .padding(.horizontal, PWSTokens.spacing16)
                    .frame(minHeight: 52)
                    .background(PWSTokens.secondaryPanelBackground)
                    .clipShape(RoundedRectangle(cornerRadius: PWSTokens.compactRadius, style: .continuous))
                    .overlay {
                        RoundedRectangle(cornerRadius: PWSTokens.compactRadius, style: .continuous)
                            .stroke(focusedField == .email ? PWSTokens.actionBlue : PWSTokens.border, lineWidth: 1)
                    }

                    // 비밀번호
                    HStack(spacing: PWSTokens.spacing12) {
                        Image(systemName: "lock")
                            .font(.system(size: 16))
                            .foregroundStyle(PWSTokens.mutedText)
                            .frame(width: 20)

                        if showPassword {
                            TextField("비밀번호", text: $password)
                                .textContentType(.password)
                                .focused($focusedField, equals: .password)
                                .font(.body)
                        } else {
                            SecureField("비밀번호", text: $password)
                                .textContentType(.password)
                                .focused($focusedField, equals: .password)
                                .font(.body)
                        }

                        Button {
                            showPassword.toggle()
                        } label: {
                            Image(systemName: showPassword ? "eye.slash" : "eye")
                                .font(.system(size: 14))
                                .foregroundStyle(PWSTokens.mutedText)
                        }
                    }
                    .padding(.horizontal, PWSTokens.spacing16)
                    .frame(minHeight: 52)
                    .background(PWSTokens.secondaryPanelBackground)
                    .clipShape(RoundedRectangle(cornerRadius: PWSTokens.compactRadius, style: .continuous))
                    .overlay {
                        RoundedRectangle(cornerRadius: PWSTokens.compactRadius, style: .continuous)
                            .stroke(focusedField == .password ? PWSTokens.actionBlue : PWSTokens.border, lineWidth: 1)
                    }
                }
                .padding(.horizontal, PWSTokens.spacing24)

                // MARK: - 에러 메시지
                if let errorMessage, !errorMessage.isEmpty {
                    PWSStatusBanner(
                        title: "로그인 실패",
                        message: errorMessage,
                        kind: .warning
                    )
                    .padding(.horizontal, PWSTokens.spacing24)
                    .padding(.top, PWSTokens.spacing12)
                }

                // MARK: - 로그인 버튼
                Button {
                    focusedField = nil
                    onLogin(normalizedEmail, password)
                } label: {
                    HStack(spacing: PWSTokens.spacing8) {
                        if isLoading {
                            ProgressView()
                                .tint(.white)
                        }
                        Text(isLoading ? "로그인 중..." : "로그인")
                            .font(.system(size: 17, weight: .semibold))
                    }
                    .frame(maxWidth: .infinity, minHeight: 52)
                    .foregroundStyle(.white)
                    .background(canSubmit ? PWSTokens.actionBlue : PWSTokens.mutedText)
                    .clipShape(RoundedRectangle(cornerRadius: PWSTokens.compactRadius, style: .continuous))
                }
                .disabled(!canSubmit)
                .padding(.horizontal, PWSTokens.spacing24)
                .padding(.top, PWSTokens.spacing24)

                // MARK: - 비밀번호 찾기
                Button {
                    // TODO: 비밀번호 재설정
                } label: {
                    Text("비밀번호를 잊으셨나요?")
                        .font(.system(size: 14, weight: .medium))
                        .foregroundStyle(PWSTokens.actionBlue)
                }
                .padding(.top, PWSTokens.spacing16)

                // MARK: - 구분선
                HStack(spacing: PWSTokens.spacing16) {
                    Rectangle()
                        .fill(PWSTokens.border)
                        .frame(height: 1)
                    Text("또는")
                        .font(.system(size: 13, weight: .medium))
                        .foregroundStyle(PWSTokens.mutedText)
                    Rectangle()
                        .fill(PWSTokens.border)
                        .frame(height: 1)
                }
                .padding(.horizontal, PWSTokens.spacing24)
                .padding(.top, PWSTokens.spacing32)

                // MARK: - 소셜 로그인
                VStack(spacing: PWSTokens.spacing12) {
                    SocialLoginButton(
                        title: "Apple로 로그인",
                        icon: "apple.logo",
                        backgroundColor: .black,
                        foregroundColor: .white
                    ) {
                        // TODO: Apple 로그인
                    }

                    SocialLoginButton(
                        title: "Google로 로그인",
                        icon: "g.circle.fill",
                        backgroundColor: .white,
                        foregroundColor: Color(red: 0.2, green: 0.2, blue: 0.2),
                        borderColor: PWSTokens.border
                    ) {
                        // TODO: Google 로그인
                    }

                    SocialLoginButton(
                        title: "KakaoTalk으로 로그인",
                        icon: "message.circle.fill",
                        backgroundColor: Color(red: 1.0, green: 0.9, blue: 0.0),
                        foregroundColor: Color(red: 0.2, green: 0.15, blue: 0.0)
                    ) {
                        // TODO: KakaoTalk 로그인
                    }
                }
                .padding(.horizontal, PWSTokens.spacing24)
                .padding(.top, PWSTokens.spacing24)

                // MARK: - 회원가입
                HStack(spacing: PWSTokens.spacing4) {
                    Text("계정이 없으신가요?")
                        .font(.system(size: 14))
                        .foregroundStyle(PWSTokens.tertiaryText)
                    Button {
                        // TODO: 회원가입
                    } label: {
                        Text("회원가입")
                            .font(.system(size: 14, weight: .semibold))
                            .foregroundStyle(PWSTokens.actionBlue)
                    }
                }
                .padding(.top, PWSTokens.spacing32)
                .padding(.bottom, PWSTokens.spacing48)
            }
        }
        .scrollDismissesKeyboard(.interactively)
        .background(PWSTokens.pageBackground.ignoresSafeArea())
    }
}

// MARK: - Social Login Button

private struct SocialLoginButton: View {
    let title: String
    let icon: String
    let backgroundColor: Color
    let foregroundColor: Color
    var borderColor: Color = .clear
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            HStack(spacing: PWSTokens.spacing12) {
                Image(systemName: icon)
                    .font(.system(size: 18))
                    .frame(width: 24)
                Text(title)
                    .font(.system(size: 15, weight: .medium))
            }
            .frame(maxWidth: .infinity, minHeight: 50)
            .foregroundStyle(foregroundColor)
            .background(backgroundColor)
            .clipShape(RoundedRectangle(cornerRadius: PWSTokens.compactRadius, style: .continuous))
            .overlay {
                RoundedRectangle(cornerRadius: PWSTokens.compactRadius, style: .continuous)
                    .stroke(borderColor, lineWidth: 1)
            }
        }
        .buttonStyle(PWSPressableButtonStyle(scale: 0.98))
    }
}

private enum LoginField {
    case email
    case password
}
