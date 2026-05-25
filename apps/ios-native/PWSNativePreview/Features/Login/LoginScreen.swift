import SwiftUI

struct LoginScreen: View {
    let environment: AppEnvironment
    let isLoading: Bool
    let errorMessage: String?
    let onLogin: (String) -> Void
    @State private var testerId = ""
    @FocusState private var isTesterFieldFocused: Bool

    var normalizedId: String {
        environment.testerAuth.normalizedTesterId(testerId)
    }

    var body: some View {
        VStack(spacing: 0) {
            Spacer(minLength: PWSTokens.spacing48)
            VStack(alignment: .leading, spacing: PWSTokens.spacing32) {
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
                        Text("테스터 로그인")
                            .font(.system(.title3, design: .default, weight: .semibold))
                            .foregroundStyle(PWSTokens.primaryText)
                        Text("사전 등록된 테스터 ID로 이용할 수 있어요. 소셜 로그인은 현재 빌드에서 제공하지 않습니다.")
                            .font(.callout)
                            .foregroundStyle(PWSTokens.secondaryText)
                            .fixedSize(horizontal: false, vertical: true)
                    }

                    TextField("테스터 아이디 입력", text: $testerId)
                        .textInputAutocapitalization(.never)
                        .autocorrectionDisabled()
                        .focused($isTesterFieldFocused)
                        .font(.body)
                        .padding(.horizontal, PWSTokens.spacing17)
                        .frame(minHeight: 52)
                        .background(PWSTokens.secondaryPanelBackground)
                        .clipShape(RoundedRectangle(cornerRadius: PWSTokens.compactRadius, style: .continuous))
                        .overlay {
                            RoundedRectangle(cornerRadius: PWSTokens.compactRadius, style: .continuous)
                                .stroke(isTesterFieldFocused ? PWSTokens.actionBlue : PWSTokens.border, lineWidth: 1)
                        }
                        .accessibilityLabel("테스터 아이디")
                        .accessibilityHint("등록된 테스터 아이디를 입력하세요")

                    if !normalizedId.isEmpty {
                        Text("세션: \(environment.testerAuth.localSessionId(for: normalizedId))")
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

                    PWSPrimaryButton("테스터로 시작하기", systemImage: "person.crop.circle") {
                        onLogin(normalizedId)
                    }
                    .accessibilityLabel("테스터로 시작하기")
                    .accessibilityHint("테스터 계정으로 로그인합니다")
                    .disabled(normalizedId.isEmpty || isLoading)
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
        .background(PWSTokens.pageBackground.ignoresSafeArea())
        .safeAreaInset(edge: .bottom) {
            Text("PWS Native Preview")
                .font(.caption)
                .foregroundStyle(PWSTokens.tertiaryText)
                .padding(.bottom, PWSTokens.spacing17)
        }
    }
}
