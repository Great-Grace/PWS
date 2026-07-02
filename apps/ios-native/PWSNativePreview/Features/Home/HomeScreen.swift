import SwiftUI

struct HomeScreen: View {
    let environment: AppEnvironment
    let session: PWSSession
    let weatherState: WeatherRepositoryState
    let feedbackState: FeedbackRepositoryState
    let predictionResult: PredictionResult?
    var onNavigateToFeedback: (() -> Void)?

    /// V2 feature flag (기본 활성화, 0이면 V1 폴백)
    private static let useWeatherSceneV2: Bool = {
        ProcessInfo.processInfo.environment["PWS_WEATHER_SCENE_V2"] != "0"
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
                    feedbackCTALegacy
                    recommendationsSectionLegacy
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

    private var feedbackCTALegacy: some View {
        Button {
            onNavigateToFeedback?()
        } label: {
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
        }
        .buttonStyle(PWSPressableButtonStyle())
        .padding(.horizontal, PWSTokens.spacing24)
        .padding(.top, PWSTokens.spacing16)
    }

    private var recommendationsSectionLegacy: some View {
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

    // MARK: - Bottom Glassmorphic Cards

    private var outfitGuide: some View {
        let tempC = weatherState.data?.current.temp ?? 20
        let outfitAsset = outfitAssetName(tempC: tempC)
        let outfitDesc = outfitDescription(tempC: tempC)
        
        return VStack(alignment: .leading, spacing: PWSTokens.spacing16) {
            Text("오늘의 추천 옷차림")
                .font(.system(size: 18, weight: .bold))
                .foregroundStyle(.white)
            
            HStack(spacing: PWSTokens.spacing16) {
                if let outfitImage = UIImage(named: outfitAsset) {
                    Image(uiImage: outfitImage)
                        .resizable()
                        .aspectRatio(contentMode: .fit)
                        .frame(width: 100, height: 100)
                        .background(Color.white.opacity(0.1))
                        .clipShape(RoundedRectangle(cornerRadius: 16))
                } else {
                    RoundedRectangle(cornerRadius: 16)
                        .fill(Color.white.opacity(0.1))
                        .frame(width: 100, height: 100)
                        .overlay(Image(systemName: "tshirt").font(.largeTitle).foregroundStyle(.white))
                }
                
                VStack(alignment: .leading, spacing: 8) {
                    Text(outfitDesc)
                        .font(.system(size: 15, weight: .bold))
                        .foregroundStyle(.white)
                        .lineLimit(2)
                    Text("현재 기온에 맞춘 코디입니다.")
                        .font(.system(size: 13))
                        .foregroundStyle(.white.opacity(0.7))
                }
                Spacer()
            }
        }
        .padding(PWSTokens.spacing20)
        .background(.ultraThinMaterial)
        .clipShape(RoundedRectangle(cornerRadius: PWSTokens.radius, style: .continuous))
    }
    
    private func outfitAssetName(tempC: Double) -> String {
        switch tempC {
        case ..<5: return "outfit_winter_padding"
        case 5..<13: return "outfit_winter_coat"
        case 13..<23: return "outfit_spring_cardigan"
        case 23..<30: return "outfit_spring_light"
        default: return "outfit_summer_light"
        }
    }
    
    private func outfitDescription(tempC: Double) -> String {
        switch tempC {
        case ..<5: return "매우 춥습니다. 든든한 패딩과 방한 용품을 꼭 챙기세요."
        case 5..<13: return "쌀쌀한 날씨입니다. 따뜻한 코트나 두꺼운 자켓이 좋습니다."
        case 13..<23: return "선선합니다. 가벼운 가디건이나 얇은 자켓을 걸치세요."
        case 23..<30: return "따뜻한 날씨입니다. 가벼운 긴팔이나 얇은 셔츠가 적당합니다."
        default: return "무더운 날씨입니다. 시원한 반팔과 반바지를 추천합니다."
        }
    }

    private var feedbackCTA: some View {
        Button {
            onNavigateToFeedback?()
        } label: {
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
        .buttonStyle(PWSPressableButtonStyle())
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
