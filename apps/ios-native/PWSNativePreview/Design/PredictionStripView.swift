import SwiftUI

// MARK: - Prediction Strip View
// 시간대별 체감 예측 카드 (아침/낮/저녁)

struct PredictionStripView: View {
    let morning: SlotPrediction?
    let afternoon: SlotPrediction?
    let evening: SlotPrediction?

    @State private var appeared = false

    struct SlotPrediction {
        let feel: Double           // 연속값 1~7
        let confidence: String     // cold_start | low | medium | high
        let temp: Double?          // 예상 기온
        let weatherCode: Int?      // 예상 날씨
    }

    var body: some View {
        VStack(alignment: .leading, spacing: PWSTokens.spacing12) {
            Text("시간대별 체감 예측")
                .font(.system(size: 14, weight: .semibold))
                .foregroundStyle(.white.opacity(0.7))

            HStack(spacing: PWSTokens.spacing12) {
                slotCard(
                    title: "아침",
                    time: "06-10시",
                    icon: "sunrise",
                    prediction: morning,
                    delay: 0
                )
                slotCard(
                    title: "낮",
                    time: "10-18시",
                    icon: "sun.max",
                    prediction: afternoon,
                    delay: 0.15
                )
                slotCard(
                    title: "저녁",
                    time: "18-22시",
                    icon: "moon",
                    prediction: evening,
                    delay: 0.3
                )
            }
        }
        .padding(.horizontal, PWSTokens.spacing24)
        .onAppear {
            withAnimation(.easeOut(duration: 0.5)) {
                appeared = true
            }
        }
    }

    // MARK: - Slot Card

    @ViewBuilder
    private func slotCard(
        title: String,
        time: String,
        icon: String,
        prediction: SlotPrediction?,
        delay: Double
    ) -> some View {
        VStack(spacing: PWSTokens.spacing8) {
            // 아이콘 + 시간
            HStack(spacing: 4) {
                Image(systemName: icon)
                    .font(.system(size: 12, weight: .semibold))
                Text(time)
                    .font(.system(size: 11, weight: .medium))
            }
            .foregroundStyle(.white.opacity(0.6))

            if let prediction {
                // 예측 값
                Text(String(format: "%.1f", prediction.feel))
                    .font(.system(size: 28, weight: .bold, design: .rounded))
                    .foregroundStyle(feelColor(prediction.feel))
                    .contentTransition(.numericText(value: prediction.feel))

                // 라벨
                Text(feelLabel(prediction.feel))
                    .font(.system(size: 12, weight: .semibold))
                    .foregroundStyle(.white.opacity(0.8))

                // 신뢰도 바
                confidenceBar(level: prediction.confidence)

                // 예상 기온
                if let temp = prediction.temp {
                    Text("\(Int(temp.rounded()))°")
                        .font(.system(size: 11))
                        .foregroundStyle(.white.opacity(0.5))
                }
            } else {
                // 데이터 없음
                VStack(spacing: 4) {
                    Text("--")
                        .font(.system(size: 28, weight: .bold, design: .rounded))
                        .foregroundStyle(.white.opacity(0.3))
                    Text("데이터 없음")
                        .font(.system(size: 11))
                        .foregroundStyle(.white.opacity(0.4))
                }
            }
        }
        .frame(maxWidth: .infinity, minHeight: 140)
        .padding(.vertical, PWSTokens.spacing12)
        .background(.ultraThinMaterial.opacity(0.25))
        .clipShape(RoundedRectangle(cornerRadius: PWSTokens.compactRadius, style: .continuous))
        .opacity(appeared ? 1 : 0)
        .offset(y: appeared ? 0 : 20)
        .animation(.easeOut(duration: 0.5).delay(delay), value: appeared)
        .accessibilityElement(children: .combine)
        .accessibilityLabel("\(title) 예측")
        .accessibilityValue(prediction.map { "\(String(format: "%.1f", $0.feel))점, \(feelLabel($0.feel))" } ?? "데이터 없음")
    }

    // MARK: - Confidence Bar

    private func confidenceBar(level: String) -> some View {
        let segments = 4
        let filled: Int
        switch level {
        case "cold_start": filled = 1
        case "low":        filled = 2
        case "medium":     filled = 3
        case "high":       filled = 4
        default:           filled = 2
        }

        return HStack(spacing: 3) {
            ForEach(0..<segments, id: \.self) { index in
                RoundedRectangle(cornerRadius: 2)
                    .fill(index < filled ? .white.opacity(0.7) : .white.opacity(0.15))
                    .frame(width: 12, height: 3)
            }
        }
    }

    // MARK: - Helpers

    private func feelColor(_ score: Double) -> Color {
        switch score {
        case ..<2:    return Color(red: 0.3, green: 0.5, blue: 1.0)
        case ..<3:    return Color(red: 0.4, green: 0.65, blue: 1.0)
        case ..<4:    return Color(red: 0.3, green: 0.8, blue: 0.6)
        case ..<5:    return Color(red: 0.4, green: 0.85, blue: 0.4)
        case ..<6:    return Color(red: 1.0, green: 0.7, blue: 0.3)
        default:      return Color(red: 1.0, green: 0.4, blue: 0.3)
        }
    }

    private func feelLabel(_ score: Double) -> String {
        switch score {
        case ..<1.5: return "매우 추움"
        case ..<2.5: return "추움"
        case ..<3.5: return "선선함"
        case ..<4.5: return "쾌적"
        case ..<5.5: return "따뜻함"
        case ..<6.5: return "더움"
        default:      return "매우 더움"
        }
    }
}
