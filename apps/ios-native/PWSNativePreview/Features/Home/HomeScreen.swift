import SwiftUI

struct HomeScreen: View {
    let environment: AppEnvironment
    let session: PWSSession
    let weatherState: WeatherRepositoryState

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
            PWSStrictScreen {
                weatherHero
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
                .padding(.horizontal, PWSTokens.spacing24)
                .padding(.top, PWSTokens.spacing16)
            }
            .navigationBarTitleDisplayMode(.inline)
        }
    }

    private var weatherHero: some View {
        VStack(alignment: .leading, spacing: PWSTokens.spacing14) {
            HStack(alignment: .top) {
                VStack(alignment: .leading, spacing: PWSTokens.spacing4) {
                    Text("서울특별시 · \(FeedbackContract().pwsDateString(from: Date()))")
                        .font(.system(size: 14))
                        .foregroundStyle(PWSTokens.tertiaryText)
                    Text(weatherState.isLoading ? "날씨를 불러오는 중" : "날씨 어시스턴트")
                        .font(.system(size: 18, weight: .semibold))
                        .foregroundStyle(PWSTokens.primaryText)
                }
                Spacer()
                Image(systemName: "sun.max")
                    .font(.system(size: 34, weight: .regular))
                    .foregroundStyle(Color(red: 1.00, green: 0.58, blue: 0.00))
            }

            HStack(alignment: .lastTextBaseline, spacing: PWSTokens.spacing8) {
                Text(currentWeather.map { "\(Int($0.temp.rounded()))°" } ?? "--°")
                    .font(.system(size: 56, weight: .bold))
                    .foregroundStyle(PWSTokens.primaryText)
                Text(currentWeather?.weatherDescription ?? "대기 중")
                    .font(.system(size: 24))
                    .foregroundStyle(PWSTokens.mutedText)
            }

            HStack(spacing: PWSTokens.spacing16) {
                Text(currentWeather.map { "체감 \(Int($0.feelsLike.rounded()))°" } ?? "체감 --°")
                Text(currentWeather.map { "습도 \($0.humidity)%" } ?? "습도 --%")
                Text(currentWeather.map { "바람 \(String(format: "%.1f", $0.windSpeed))m/s" } ?? "바람 --m/s")
            }
            .font(.system(size: 14))
            .foregroundStyle(PWSTokens.secondaryText)

            if let error = weatherState.error {
                PWSStatusBanner(title: "날씨 오류", message: error, kind: .warning)
            }
        }
        .padding(.horizontal, PWSTokens.spacing24)
        .padding(.top, PWSTokens.spacing16)
        .padding(.bottom, PWSTokens.spacing20)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(PWSTokens.panelBackground)
        .overlay(alignment: .bottom) {
            Rectangle().fill(PWSTokens.border).frame(height: 1)
        }
    }

    private var currentWeather: CurrentWeatherNative? {
        weatherState.data?.current
    }

    private var outfitGuide: some View {
        PWSStrictCard(radius: PWSTokens.radius, border: PWSTokens.strongBorder) {
            HStack(spacing: PWSTokens.spacing12) {
                PWSIconSquare(systemName: "tshirt", fill: PWSTokens.secondaryPanelBackground, size: 40)
                Text("오늘 옷차림 가이드")
                    .font(.system(size: 18, weight: .semibold))
                    .foregroundStyle(PWSTokens.primaryText)
            }
            .padding(.bottom, PWSTokens.spacing8)

            ForEach(guideRows) { row in
                VStack(alignment: .leading, spacing: PWSTokens.spacing8) {
                    Text(row.time)
                        .font(.system(size: 12, weight: .medium))
                        .foregroundStyle(Color(red: 0.00, green: 0.41, blue: 0.66))
                    Text(row.message)
                        .font(.system(size: 14, weight: .medium))
                        .foregroundStyle(Color(red: 0.16, green: 0.15, blue: 0.14))
                }
                .padding(.horizontal, PWSTokens.spacing16)
                .frame(maxWidth: .infinity, minHeight: 66, alignment: .leading)
                .background(row.fill)
                .clipShape(RoundedRectangle(cornerRadius: PWSTokens.compactRadius, style: .continuous))
                .overlay {
                    RoundedRectangle(cornerRadius: PWSTokens.compactRadius, style: .continuous)
                        .stroke(row.border, lineWidth: 1)
                }
            }
        }
        .padding(.horizontal, PWSTokens.spacing24)
        .padding(.top, PWSTokens.spacing16)
    }

    private var feedbackCTA: some View {
        HStack {
            VStack(alignment: .leading, spacing: PWSTokens.spacing4) {
                Text("오늘 체감 기록하기")
                    .font(.system(size: 16, weight: .semibold))
                    .foregroundStyle(PWSTokens.primaryText)
                Text("날씨가 어떻게 느껴지셨나요?")
                    .font(.system(size: 14, weight: .medium))
                    .foregroundStyle(PWSTokens.secondaryText)
            }
            Spacer()
            Image(systemName: "arrow.right")
                .font(.system(size: 16, weight: .semibold))
                .frame(width: 36, height: 36)
                .background(PWSTokens.secondaryPanelBackground)
                .clipShape(RoundedRectangle(cornerRadius: PWSTokens.smallRadius, style: .continuous))
        }
        .padding(.horizontal, PWSTokens.spacing16)
        .padding(.vertical, PWSTokens.spacing14)
        .frame(maxWidth: .infinity, minHeight: 76, alignment: .leading)
        .background(PWSTokens.panelBackground)
        .clipShape(RoundedRectangle(cornerRadius: PWSTokens.radius, style: .continuous))
        .overlay {
            RoundedRectangle(cornerRadius: PWSTokens.radius, style: .continuous)
                .stroke(PWSTokens.strongBorder, lineWidth: 1)
        }
        .shadow(color: .black.opacity(0.14), radius: 14, x: 0, y: 8)
        .padding(.horizontal, PWSTokens.spacing24)
        .padding(.top, PWSTokens.spacing16)
    }

    private var recommendationsSection: some View {
        VStack(alignment: .leading, spacing: PWSTokens.spacing12) {
            Text("오늘은 이런 준비가 좋아요")
                .font(.system(size: 20, weight: .semibold))
                .foregroundStyle(PWSTokens.primaryText)

            VStack(spacing: PWSTokens.spacing12) {
                ForEach(recommendations) { item in
                    HStack(spacing: PWSTokens.spacing12) {
                        PWSIconSquare(systemName: item.icon, fill: item.iconFill, foreground: item.dot, size: 44)
                        VStack(alignment: .leading, spacing: PWSTokens.spacing8) {
                            Text(item.title)
                                .font(.system(size: 16, weight: .medium))
                                .foregroundStyle(PWSTokens.primaryText)
                            HStack(spacing: PWSTokens.spacing8) {
                                Circle()
                                    .fill(item.dot)
                                    .frame(width: 6, height: 6)
                                Text(item.detail)
                                    .font(.system(size: 14))
                                    .foregroundStyle(PWSTokens.secondaryText)
                            }
                        }
                    }
                    .padding(PWSTokens.spacing14)
                    .frame(maxWidth: .infinity, minHeight: 70, alignment: .leading)
                    .background(item.fill)
                    .clipShape(RoundedRectangle(cornerRadius: PWSTokens.compactRadius, style: .continuous))
                    .overlay {
                        RoundedRectangle(cornerRadius: PWSTokens.compactRadius, style: .continuous)
                            .stroke(item.fill.opacity(0.8), lineWidth: 1)
                    }
                    .shadow(color: .black.opacity(0.06), radius: 3, x: 0, y: 1)
                }
            }
        }
        .padding(.horizontal, PWSTokens.spacing24)
        .padding(.top, PWSTokens.spacing20)
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
