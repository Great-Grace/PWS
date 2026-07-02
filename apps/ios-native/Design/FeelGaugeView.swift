import SwiftUI

// MARK: - Feel Gauge View
// 퍼셉트론 출력 (연속값 1~7)을 시각적 게이지로 표현 (심플 가로 바)

struct FeelGaugeView: View {
    let feelScore: Double       // 연속값 1.0~7.0
    let confidence: PredictionConfidence
    let label: String?          // 커스텀 라벨

    private var clampedScore: Double {
        max(1, min(7, feelScore))
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

    var body: some View {
        VStack(spacing: 8) {
            // 게이지 바
            GeometryReader { geometry in
                let width = geometry.size.width
                let markerX = (clampedScore - 1) / 6 * width

                ZStack(alignment: .leading) {
                    // 배경 그라디언트 트랙
                    RoundedRectangle(cornerRadius: 4)
                        .fill(
                            LinearGradient(
                                colors: [
                                    Color(red: 0.3, green: 0.5, blue: 1.0),
                                    Color(red: 0.3, green: 0.8, blue: 0.6),
                                    Color(red: 0.4, green: 0.85, blue: 0.4),
                                    Color(red: 1.0, green: 0.85, blue: 0.3),
                                    Color(red: 1.0, green: 0.6, blue: 0.3),
                                    Color(red: 1.0, green: 0.4, blue: 0.3)
                                ],
                                startPoint: .leading,
                                endPoint: .trailing
                            )
                        )
                        .frame(height: 8)
                        .opacity(0.6)

                    // 마커 (현재 상태 표시)
                    Circle()
                        .fill(.white)
                        .frame(width: 18, height: 18)
                        .shadow(color: .black.opacity(0.3), radius: 3, x: 0, y: 1)
                        .overlay(
                            Circle()
                                .fill(gaugeColor)
                                .frame(width: 10, height: 10)
                        )
                        .offset(x: markerX - 9)
                }
            }
            .frame(height: 18)

            // 하단 라벨
            HStack {
                Text("추움")
                    .font(.system(size: 13, weight: .bold))
                    .foregroundStyle(.white.opacity(0.9))
                Spacer()
                Text("쾌적")
                    .font(.system(size: 13, weight: .bold))
                    .foregroundStyle(.white.opacity(0.9))
                Spacer()
                Text("더움")
                    .font(.system(size: 13, weight: .bold))
                    .foregroundStyle(.white.opacity(0.9))
            }
        }
        .padding(.vertical, 8)
        .accessibilityElement(children: .combine)
        .accessibilityLabel("체감 예측 게이지")
        .accessibilityValue("\(String(format: "%.1f", clampedScore))점")
        .animation(.spring(response: 0.4, dampingFraction: 0.7), value: clampedScore)
    }
}
