import SwiftUI

// MARK: - Feel Gauge View
// 퍼셉트론 출력 (연속값 1~7)을 시각적 게이지로 표현

struct FeelGaugeView: View {
    let feelScore: Double       // 연속값 1.0~7.0
    let confidence: PredictionConfidence
    let label: String?          // 커스텀 라벨 (nil이면 자동)

    @State private var animatedScore: Double = 4.0

    private var clampedScore: Double {
        max(1, min(7, feelScore))
    }

    private var displayLabel: String {
        if let label { return label }
        switch clampedScore {
        case ..<1.5: return "매우 추움"
        case ..<2.5: return "추움"
        case ..<3.5: return "선선함"
        case ..<4.5: return "쾌적함"
        case ..<5.5: return "따뜻함"
        case ..<6.5: return "더움"
        default:      return "매우 더움"
        }
    }

    private var gaugeColor: Color {
        switch clampedScore {
        case ..<2:    return Color(red: 0.3, green: 0.5, blue: 1.0)
        case ..<3:    return Color(red: 0.4, green: 0.65, blue: 1.0)
        case ..<4:    return Color(red: 0.3, green: 0.8, blue: 0.6)
        case ..<5:    return Color(red: 0.4, green: 0.85, blue: 0.4)
        case ..<6:    return Color(red: 1.0, green: 0.7, blue: 0.3)
        default:      return Color(red: 1.0, green: 0.4, blue: 0.3)
        }
    }

    private var confidenceWidth: CGFloat {
        switch confidence {
        case .cold_start: return 0.3
        case .low:        return 0.5
        case .medium:     return 0.75
        case .high:       return 1.0
        }
    }

    var body: some View {
        VStack(alignment: .leading, spacing: PWSTokens.spacing12) {
            // 상단: 점수 + 라벨
            HStack(alignment: .lastTextBaseline, spacing: PWSTokens.spacing8) {
                Text(String(format: "%.1f", animatedScore))
                    .font(.system(size: 36, weight: .bold, design: .rounded))
                    .foregroundStyle(gaugeColor)
                    .contentTransition(.numericText(value: animatedScore))

                Text(displayLabel)
                    .font(.system(size: 16, weight: .semibold))
                    .foregroundStyle(.white.opacity(0.9))

                Spacer()

                confidenceBadge
            }

            // 게이지 바
            GeometryReader { geometry in
                let width = geometry.size.width
                let markerX = (animatedScore - 1) / 6 * width

                ZStack(alignment: .leading) {
                    // 배경 그라디언트 트랙
                    gaugeTrack(width: width)

                    // 신뢰도 영역 (반투명 밴드)
                    confidenceBand(width: width)

                    // 마커
                    gaugeMarker(x: markerX)
                }
            }
            .frame(height: 32)

            // 하단: 라벨
            HStack {
                Text("추움")
                    .font(.system(size: 11, weight: .medium))
                    .foregroundStyle(.white.opacity(0.5))
                Spacer()
                Text("쾌적")
                    .font(.system(size: 11, weight: .medium))
                    .foregroundStyle(.white.opacity(0.5))
                Spacer()
                Text("더움")
                    .font(.system(size: 11, weight: .medium))
                    .foregroundStyle(.white.opacity(0.5))
            }
        }
        .padding(PWSTokens.spacing16)
        .background(.ultraThinMaterial.opacity(0.3))
        .clipShape(RoundedRectangle(cornerRadius: PWSTokens.radius, style: .continuous))
        .accessibilityElement(children: .combine)
        .accessibilityLabel("체감 예측 게이지")
        .accessibilityValue("\(String(format: "%.1f", animatedScore))점, \(displayLabel), 신뢰도 \(confidenceLabel)")
        .onAppear {
            withAnimation(.spring(response: 0.6, dampingFraction: 0.7)) {
                animatedScore = clampedScore
            }
        }
        .onChange(of: feelScore) { _, newValue in
            withAnimation(.spring(response: 0.4, dampingFraction: 0.7)) {
                animatedScore = max(1, min(7, newValue))
            }
        }
    }

    // MARK: - Gauge Track

    private func gaugeTrack(width: CGFloat) -> some View {
        RoundedRectangle(cornerRadius: 6)
            .fill(
                LinearGradient(
                    colors: [
                        Color(red: 0.3, green: 0.5, blue: 1.0),
                        Color(red: 0.3, green: 0.8, blue: 0.6),
                        Color(red: 0.4, green: 0.85, blue: 0.4),
                        Color(red: 1.0, green: 0.85, blue: 0.3),
                        Color(red: 1.0, green: 0.6, blue: 0.3),
                        Color(red: 1.0, green: 0.4, blue: 0.3),
                    ],
                    startPoint: .leading,
                    endPoint: .trailing
                )
            )
            .frame(height: 8)
            .opacity(0.4)
    }

    // MARK: - Confidence Band

    private func confidenceBand(width: CGFloat) -> some View {
        let centerX = (animatedScore - 1) / 6 * width
        let bandWidth = width * confidenceWidth * 0.15

        return RoundedRectangle(cornerRadius: 4)
            .fill(gaugeColor.opacity(0.25))
            .frame(width: bandWidth * 2, height: 16)
            .offset(x: centerX - bandWidth)
    }

    // MARK: - Marker

    private func gaugeMarker(x: CGFloat) -> some View {
        Circle()
            .fill(.white)
            .frame(width: 24, height: 24)
            .shadow(color: .black.opacity(0.2), radius: 4, x: 0, y: 2)
            .overlay(
                Circle()
                    .fill(gaugeColor)
                    .frame(width: 16, height: 16)
            )
            .offset(x: x - 12)
    }

    // MARK: - Confidence Badge

    private var confidenceBadge: some View {
        HStack(spacing: 4) {
            Circle()
                .fill(confidenceColor)
                .frame(width: 6, height: 6)
            Text(confidenceLabel)
                .font(.system(size: 11, weight: .semibold))
                .foregroundStyle(.white.opacity(0.7))
        }
        .padding(.horizontal, 10)
        .padding(.vertical, 5)
        .background(.ultraThinMaterial.opacity(0.3))
        .clipShape(Capsule())
    }

    private var confidenceColor: Color {
        switch confidence {
        case .cold_start: return .gray
        case .low:        return .orange
        case .medium:     return .yellow
        case .high:       return .green
        }
    }

    private var confidenceLabel: String {
        switch confidence {
        case .cold_start: return "학습 중"
        case .low:        return "낮음"
        case .medium:     return "보통"
        case .high:       return "높음"
        }
    }
}
