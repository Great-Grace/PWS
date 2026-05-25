import SwiftUI

struct SettingsScreen: View {
    let session: PWSSession
    let onSignOut: () -> Void
    let onDeleteAccount: () -> Void
    @State private var notifications = true
    @State private var morningAlert = true
    @State private var eveningAlert = false
    @State private var coldSensitivity = 0.55
    @State private var heatSensitivity = 0.60
    @State private var humiditySensitivity = 0.42
    @State private var isConfirmingAccountDeletion = false

    private var strictCopyDisplayName: String {
        session.testerId == TesterAuth.figmaParityTesterId ? "지우진" : session.displayName
    }

    var body: some View {
        PWSStrictScreen {
            PWSAppHeader("설정")
            profileCard

            PWSStrictSection(title: "위치") {
                PWSStrictCard(radius: PWSTokens.compactRadius) {
                    PWSSettingItem("현재 위치", value: "서울특별시", systemImage: "location")
                }
            }

            PWSStrictSection(title: "알림", background: PWSTokens.warmPanelBackground) {
                PWSStrictCard(radius: PWSTokens.radius) {
                    PWSToggleRow(title: "알림 받기", subtitle: "날씨 추천 알림을 받습니다", systemImage: "bell", isOn: $notifications)
                    Divider().foregroundStyle(PWSTokens.border)
                    PWSToggleRow(title: "아침 알림", subtitle: "오전 8시 날씨 추천", systemImage: "bell", isOn: $morningAlert)
                    Divider().foregroundStyle(PWSTokens.border)
                    PWSToggleRow(title: "저녁 알림", subtitle: "오후 6시 체감 기록 요청", systemImage: "bell", isOn: $eveningAlert)
                }
            }

            PWSStrictSection(title: "추천 설정") {
                VStack(spacing: PWSTokens.spacing12) {
                    PWSStrictCard(radius: PWSTokens.compactRadius) {
                        PWSSettingItem("체감 민감도", value: "보통", systemImage: "slider.horizontal.3")
                    }
                    PWSStrictCard(radius: PWSTokens.compactRadius) {
                        PWSSettingItem("체질 프로필", value: "표준", systemImage: "person")
                    }
                }
            }

            PWSStrictSection(title: "체질 보정") {
                PWSStrictCard(radius: PWSTokens.radius) {
                    SensitivitySlider(title: "추위 민감도", value: $coldSensitivity)
                    SensitivitySlider(title: "더위 민감도", value: $heatSensitivity)
                    SensitivitySlider(title: "습도 민감도", value: $humiditySensitivity)
                    Text("슬라이더를 조정하며 당신의 체질에 맞게 추천을 개인화하세요")
                        .font(.system(size: 12))
                        .foregroundStyle(PWSTokens.tertiaryText)
                }
            }

            PWSStrictSection(title: "앱 정보") {
                VStack(spacing: PWSTokens.spacing12) {
                    PWSStrictCard(radius: PWSTokens.compactRadius) {
                        PWSSettingItem("버전", value: "1.0.0", systemImage: "info.circle", showChevron: false)
                    }
                    PWSStrictCard(radius: PWSTokens.compactRadius) {
                        PWSSettingItem("이용약관", systemImage: "info.circle")
                    }
                    PWSStrictCard(radius: PWSTokens.compactRadius) {
                        PWSSettingItem("개인정보 처리방침", systemImage: "info.circle")
                    }
                }
            }

            Button(role: .destructive, action: onSignOut) {
                HStack(spacing: PWSTokens.spacing8) {
                    Image(systemName: "rectangle.portrait.and.arrow.right")
                    Text("로그아웃")
                }
                .font(.system(size: 16, weight: .semibold))
                .foregroundStyle(PWSTokens.redText)
                .frame(maxWidth: .infinity, minHeight: 60)
                .background(Color(red: 1.0, green: 0.95, blue: 0.95))
                .clipShape(RoundedRectangle(cornerRadius: PWSTokens.compactRadius, style: .continuous))
                .overlay {
                    RoundedRectangle(cornerRadius: PWSTokens.compactRadius, style: .continuous)
                        .stroke(Color(red: 1.0, green: 0.79, blue: 0.79), lineWidth: 1)
                }
            }
            .buttonStyle(.plain)
            .padding(.horizontal, PWSTokens.spacing24)
            .padding(.top, PWSTokens.spacing8)

            Button(role: .destructive) {
                isConfirmingAccountDeletion = true
            } label: {
                HStack(spacing: PWSTokens.spacing8) {
                    Image(systemName: "trash")
                    Text("계정 삭제")
                }
                .font(.system(size: 16, weight: .semibold))
                .foregroundStyle(PWSTokens.redText)
                .frame(maxWidth: .infinity, minHeight: 60)
                .background(Color(red: 1.0, green: 0.95, blue: 0.95))
                .clipShape(RoundedRectangle(cornerRadius: PWSTokens.compactRadius, style: .continuous))
                .overlay {
                    RoundedRectangle(cornerRadius: PWSTokens.compactRadius, style: .continuous)
                        .stroke(Color(red: 1.0, green: 0.79, blue: 0.79), lineWidth: 1)
                }
            }
            .buttonStyle(.plain)
            .accessibilityHint("계정과 저장된 데이터를 삭제합니다")
            .padding(.horizontal, PWSTokens.spacing24)
            .padding(.top, PWSTokens.spacing8)
        }
        .confirmationDialog(
            "계정과 저장된 데이터를 삭제할까요?",
            isPresented: $isConfirmingAccountDeletion,
            titleVisibility: .visible
        ) {
            Button("삭제", role: .destructive, action: onDeleteAccount)
            Button("취소", role: .cancel) {}
        } message: {
            Text("삭제가 완료되기 전까지 현재 세션은 유지됩니다.")
        }
    }

    private var profileCard: some View {
        VStack(alignment: .leading, spacing: PWSTokens.spacing16) {
            HStack(spacing: PWSTokens.spacing16) {
                Text("지")
                    .font(.system(size: 20, weight: .bold))
                    .foregroundStyle(.white)
                    .frame(width: 64, height: 64)
                    .background(LinearGradient(colors: [Color(red: 1, green: 0.60, blue: 0), Color(red: 0.96, green: 0.29, blue: 0)], startPoint: .topLeading, endPoint: .bottomTrailing))
                    .clipShape(Circle())
                    .shadow(color: .black.opacity(0.16), radius: 8, x: 0, y: 4)
                VStack(alignment: .leading, spacing: PWSTokens.spacing4) {
                    Text(strictCopyDisplayName)
                        .font(.system(size: 16, weight: .semibold))
                        .foregroundStyle(PWSTokens.primaryText)
                    Text("남성 · BMI 31.1")
                        .font(.system(size: 14))
                        .foregroundStyle(PWSTokens.secondaryText)
                }
                Spacer()
            }
            Text("프로필 수정")
                .font(.system(size: 14, weight: .semibold))
                .foregroundStyle(PWSTokens.primaryText)
                .frame(maxWidth: .infinity, minHeight: 48)
                .background(PWSTokens.panelBackground)
                .clipShape(RoundedRectangle(cornerRadius: PWSTokens.compactRadius, style: .continuous))
                .overlay {
                    RoundedRectangle(cornerRadius: PWSTokens.compactRadius, style: .continuous)
                        .stroke(PWSTokens.strongBorder, lineWidth: 1)
                }
        }
        .padding(PWSTokens.spacing24)
        .frame(maxWidth: .infinity, minHeight: 180, alignment: .leading)
        .background(
            LinearGradient(colors: [PWSTokens.pageBackground, PWSTokens.secondaryPanelBackground], startPoint: .topLeading, endPoint: .bottomTrailing)
        )
        .clipShape(RoundedRectangle(cornerRadius: PWSTokens.radius, style: .continuous))
        .overlay {
            RoundedRectangle(cornerRadius: PWSTokens.radius, style: .continuous)
                .stroke(PWSTokens.strongBorder, lineWidth: 1)
        }
        .shadow(color: .black.opacity(0.12), radius: 14, x: 0, y: 8)
        .padding(.horizontal, PWSTokens.spacing24)
        .padding(.top, PWSTokens.spacing24)
    }
}

private struct SensitivitySlider: View {
    let title: String
    @Binding var value: Double

    var body: some View {
        VStack(alignment: .leading, spacing: PWSTokens.spacing8) {
            HStack {
                Text(title)
                    .font(.system(size: 14, weight: .semibold))
                    .foregroundStyle(PWSTokens.primaryText)
                Spacer()
                Text("+0°")
                    .font(.system(size: 12, weight: .semibold))
                    .foregroundStyle(PWSTokens.secondaryText)
                    .padding(.horizontal, 10)
                    .frame(height: 28)
                    .background(PWSTokens.secondaryPanelBackground)
                    .clipShape(Capsule())
            }
            Slider(value: $value, in: 0...1)
                .tint(PWSTokens.actionBlue)
        }
    }
}
