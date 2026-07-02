import SwiftUI

struct HomeScreen: View {
    let environment: AppEnvironment
    let session: PWSSession
    let weatherState: WeatherRepositoryState
    let feedbackState: FeedbackRepositoryState
    let predictionResult: PredictionResult?

    /// V2 feature flag (안전 롤백용)
    private static let useWeatherSceneV2: Bool = {
        ProcessInfo.processInfo.environment["PWS_WEATHER_SCENE_V2"] == "1"
    }()

    @State private var selectedHour: Double = Double(Calendar.current.component(.hour, from: Date()))

    private let guideRows = [
        GuideRow(time: "아침 (05-18시)", message: "조금 쌀쌀 할 수 있겠어요", fill: Color(red: 0.94, green: 0.98, blue: 1.00), border: Color(red: 0.72, green: 0.90, blue: 1.00).opacity(0.5)),
        GuideRow(time: "낮 (12-18시)", message: "조금 더울 수 있겠어요", fill: Color(red: 1.00, green: 0.95, blue: 0.94), border: Color(red: 1.00, green: 0.95, blue: 0.94).opacity(0.5)),
        GuideRow(time: "저녁 (18-24시)", message: "많이 쌀쌀 할 수 있겠어요", fill: Color(red: 0.94, green: 0.95, blue: 1.00), border: Color(red: 0.94, green: 0.95, blue: 1.00))
    ]

    private let recommendations = [
        Recommendation(title: "선크림을 바르는 것이 좋아요", detail: "자외선 지수 8 · 매우 높음", icon: "sun.max", fill: Color(red: 1.00, green: 0.98, blue: 0.92), iconFill: Color(red: 1.00, green: 0.95, blue: 0.78), dot: Color(red: 0.88, green: 0.44, blue: 0.00)),
        Recommendation(title: "미세먼지 높음 · 마스크 권장", detail: "PM2.5 76㎍/㎥", icon: "wind", fill: Color(red: 0.97, green: 0.98, blue: 0.99), iconFill: Color(red: 0.95, green: 0.96, blue: 0.98), dot: Color(red: 0.27, green: 0.33, blue: 0.42)),
        Recommendation(title: "양산 챙기면 좋아요", detail: "자외선 차단에 효과적", icon: "umbrella", fill: Color(red: 0.96, green: 0.95, blue: 1.00), iconFill: Color(red: 0.93, green: 0.91, blue: 1.00), dot: Color(red: 0.50, green: 0.13, blue: 1.00)),
        Recommendation(title: "오후 2~4시 환기 추천", detail: "미세먼지 농도가 낮아집니다", icon: "humidity", fill: Color(red: 0.93, green: 0.99, blue: 0.96), iconFill: Color(red: 0.82, green: 0.98, blue: 0.90), dot: Color(red: 0.00, green: 0.60, blue: 0.40))
    ]

    var body: some View {
        NavigationStack {
            if Self.useWeatherSceneV2 {
                WeatherSceneView(
                    weatherState: weatherState,
                    feedbackState: feedbackState,
                    predictionResult: predictionResult,
                    selectedHour: $selectedHour
                ) {
                    outfitGuide
                    feedbackCTA
                    recommendationsSection

                    NavigationLink {
                        WeatherDetailScreen()
                    } label: {
                        PWSGradientActionCard(
                            title: "다른 지역 날씨",
                            subtitle: "다른 지역 날씨와 옷차림 확인하기",
                            systemImage: "mappin.circle"
                        )
                    }
                    .buttonStyle(.plain)
                    .accessibilityLabel("다른 지역 날씨")
                }
                .navigationBarTitleDisplayMode(.inline)
                .toolbarBackground(.hidden, for: .navigationBar)
            } else {
                // V1 fallback (feature flag 꺼있을 때)
                PWSStrictScreen {
                    weatherHeroLegacy
                    outfitGuideLegacy
                    feedbackCTA
                    recommendationsSection
                }
                .navigationBarTitleDisplayMode(.inline)
            }
        }
    }

    // MARK: - V1 Fallback (feature flag off)

    private var weatherHeroLegacy: some View {
        VStack(alignment: .leading, spacing: PWSTokens.spacing14) {
            HStack(alignment: .top) {
                VStack(alignment: .leading, spacing: PWSTokens.spacing4) {
                    Text("서울특별시")
                        .font(.system(size: 14))
                        .foregroundStyle(PWSTokens.tertiaryText)
                    Text("날씨 어시스턴트")
                        .font(.system(size: 18, weight: .semibold))
                        .foregroundStyle(PWSTokens.primaryText)
                }
                Spacer()
            }
            HStack(alignment: .lastTextBaseline, spacing: PWSTokens.spacing8) {
                Text("\(Int((weatherState.data?.current.temp ?? 0).rounded()))°")
                    .font(.system(size: 56, weight: .bold))
                    .foregroundStyle(PWSTokens.primaryText)
            }
        }
        .padding(.horizontal, PWSTokens.spacing24)
        .padding(.vertical, PWSTokens.spacing20)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(PWSTokens.panelBackground)
    }

    private var outfitGuideLegacy: some View {
        PWSStrictCard(radius: PWSTokens.radius) {
            Text("옷차림 가이드")
                .font(.system(size: 18, weight: .semibold))
                .foregroundStyle(PWSTokens.primaryText)
        }
        .padding(.horizontal, PWSTokens.spacing24)
        .padding(.top, PWSTokens.spacing16)
    }

    // MARK: - Bottom Glassmorphic Cards

    private var outfitGuide: some View {
        VStack(alignment: .leading, spacing: PWSTokens.spacing12) {
            HStack(spacing: PWSTokens.spacing12) {
                PWSIconSquare(systemName: "tshirt", fill: .white.opacity(0.2), foreground: .white, size: 40)
                Text("오늘 옷차림 가이드")
                    .font(.system(size: 18, weight: .bold))
                    .foregroundStyle(.white)
            }
            .padding(.bottom, 4)

            ForEach(guideRows) { row in
                VStack(alignment: .leading, spacing: PWSTokens.spacing8) {
                    Text(row.time)
                        .font(.system(size: 12, weight: .semibold))
                        .foregroundStyle(.white.opacity(0.8))
                    Text(row.message)
                        .font(.system(size: 14, weight: .bold))
                        .foregroundStyle(.white)
                }
                .padding(.horizontal, PWSTokens.spacing16)
                .frame(maxWidth: .infinity, minHeight: 66, alignment: .leading)
                .background(.ultraThinMaterial)
                .clipShape(RoundedRectangle(cornerRadius: PWSTokens.compactRadius, style: .continuous))
            }
        }
        .padding(PWSTokens.spacing16)
        .background(.ultraThinMaterial)
        .clipShape(RoundedRectangle(cornerRadius: PWSTokens.radius, style: .continuous))
    }

    private var feedbackCTA: some View {
        HStack {
            VStack(alignment: .leading, spacing: PWSTokens.spacing4) {
                Text("오늘 체감 기록하기")
                    .font(.system(size: 16, weight: .bold))
                    .foregroundStyle(.white)
                Text("날씨가 어떻게 느껴지셨나요?")
                    .font(.system(size: 14, weight: .medium))
                    .foregroundStyle(.white.opacity(0.8))
            }
            Spacer()
            Image(systemName: "arrow.right")
                .font(.system(size: 16, weight: .semibold))
                .foregroundStyle(.white)
                .frame(width: 36, height: 36)
                .background(.white.opacity(0.2))
                .clipShape(RoundedRectangle(cornerRadius: PWSTokens.smallRadius, style: .continuous))
        }
        .padding(.horizontal, PWSTokens.spacing16)
        .frame(maxWidth: .infinity, minHeight: 76, alignment: .leading)
        .background(.ultraThinMaterial)
        .clipShape(RoundedRectangle(cornerRadius: PWSTokens.radius, style: .continuous))
    }

    private var recommendationsSection: some View {
        VStack(alignment: .leading, spacing: PWSTokens.spacing12) {
            Text("오늘은 이런 준비가 좋아요")
                .font(.system(size: 20, weight: .bold))
                .foregroundStyle(.white)

            VStack(spacing: PWSTokens.spacing12) {
                ForEach(recommendations) { item in
                    HStack(spacing: PWSTokens.spacing12) {
                        PWSIconSquare(systemName: item.icon, fill: .white.opacity(0.2), foreground: .white, size: 44)
                        VStack(alignment: .leading, spacing: PWSTokens.spacing4) {
                            Text(item.title)
                                .font(.system(size: 16, weight: .bold))
                                .foregroundStyle(.white)
                            HStack(spacing: PWSTokens.spacing8) {
                                Circle()
                                    .fill(item.dot)
                                    .frame(width: 6, height: 6)
                                Text(item.detail)
                                    .font(.system(size: 14, weight: .medium))
                                    .foregroundStyle(.white.opacity(0.8))
                            }
                        }
                    }
                    .padding(PWSTokens.spacing14)
                    .frame(maxWidth: .infinity, minHeight: 70, alignment: .leading)
                    .background(.ultraThinMaterial)
                    .clipShape(RoundedRectangle(cornerRadius: PWSTokens.compactRadius, style: .continuous))
                }
            }
        }
        .padding(.vertical, PWSTokens.spacing8)
    }
}

private struct GuideRow: Identifiable {
    let id = UUID()
    let time: String
    let message: String
    let fill: Color
    let border: Color
}

private struct Recommendation: Identifiable {
    let id = UUID()
    let title: String
    let detail: String
    let icon: String
    let fill: Color
    let iconFill: Color
    let dot: Color
}
