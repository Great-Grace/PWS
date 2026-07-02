import SwiftUI

// MARK: - Prediction Change Reason
// "왜 예측이 바뀌었는지" 사용자에게 설명

struct PredictionChangeReason: View {
    let reasons: [ChangeReason]

    struct ChangeReason: Identifiable {
        let id = UUID()
        let icon: String
        let message: String
        let impact: Impact

        enum Impact {
            case warmer, cooler, neutral
        }
    }

    var body: some View {
        VStack(alignment: .leading, spacing: PWSTokens.spacing8) {
            HStack(spacing: 6) {
                Image(systemName: "sparkles")
                    .font(.system(size: 12, weight: .semibold))
                    .foregroundStyle(.yellow)
                Text("예측 근거")
                    .font(.system(size: 13, weight: .semibold))
                    .foregroundStyle(.white.opacity(0.7))
            }

            ForEach(Array(reasons.enumerated()), id: \.element.id) { index, reason in
                HStack(spacing: PWSTokens.spacing8) {
                    Text(reason.icon)
                        .font(.system(size: 14))

                    Text(reason.message)
                        .font(.system(size: 13, weight: .medium))
                        .foregroundStyle(.white.opacity(0.85))
                        .lineLimit(2)
                        .minimumScaleFactor(0.9)

                    Spacer()

                    impactBadge(reason.impact)
                }
                .padding(.vertical, 4)
                .opacity(index < 3 ? 1 : 0) // 최대 3개만 표시
            }
        }
        .padding(PWSTokens.spacing14)
        .background(.ultraThinMaterial.opacity(0.2))
        .clipShape(RoundedRectangle(cornerRadius: PWSTokens.compactRadius, style: .continuous))
    }

    // MARK: - Impact Badge

    private func impactBadge(_ impact: ChangeReason.Impact) -> some View {
        Group {
            switch impact {
            case .warmer:
                HStack(spacing: 2) {
                    Image(systemName: "arrow.up")
                    Text("더움")
                }
                .font(.system(size: 10, weight: .bold))
                .foregroundStyle(Color(red: 1.0, green: 0.5, blue: 0.3))

            case .cooler:
                HStack(spacing: 2) {
                    Image(systemName: "arrow.down")
                    Text("추움")
                }
                .font(.system(size: 10, weight: .bold))
                .foregroundStyle(Color(red: 0.3, green: 0.6, blue: 1.0))

            case .neutral:
                HStack(spacing: 2) {
                    Image(systemName: "equal")
                    Text("유지")
                }
                .font(.system(size: 10, weight: .bold))
                .foregroundStyle(.white.opacity(0.5))
            }
        }
        .padding(.horizontal, 8)
        .padding(.vertical, 3)
        .background(.ultraThinMaterial.opacity(0.3))
        .clipShape(Capsule())
    }
}

// MARK: - Reason Builder (알고리즘 출력 → UI 변환)

struct PredictionReasonBuilder {

    /// 피드백 기반 변화 이유 생성
    static func buildFromFeedback(
        oldFeel: Double,
        newFeel: Double,
        feedbackCount: Int,
        slotName: String
    ) -> [PredictionChangeReason.ChangeReason] {
        var reasons: [PredictionChangeReason.ChangeReason] = []

        let delta = newFeel - oldFeel

        if abs(delta) > 0.3 {
            let impact: PredictionChangeReason.ChangeReason.Impact = delta > 0 ? .warmer : .cooler
            reasons.append(.init(
                icon: "📝",
                message: "\(slotName) 피드백 \(feedbackCount)건 반영",
                impact: impact
            ))
        }

        if feedbackCount >= 7 && feedbackCount < 15 {
            reasons.append(.init(
                icon: "📈",
                message: "학습 데이터가 쌓이고 있어요",
                impact: .neutral
            ))
        } else if feedbackCount >= 15 {
            reasons.append(.init(
                icon: "✅",
                message: "충분한 데이터로 정확도 향상",
                impact: .neutral
            ))
        }

        return reasons
    }

    /// 날씨 변화 기반 이유 생성
    static func buildFromWeather(
        tempChange: Double,
        humidityChange: Double,
        windChange: Double
    ) -> [PredictionChangeReason.ChangeReason] {
        var reasons: [PredictionChangeReason.ChangeReason] = []

        if abs(tempChange) > 3 {
            reasons.append(.init(
                icon: "🌡",
                message: "기온이 \(tempChange > 0 ? "상승" : "하락")했어요",
                impact: tempChange > 0 ? .warmer : .cooler
            ))
        }

        if humidityChange > 15 {
            reasons.append(.init(
                icon: "💧",
                message: "습도가 높아져 더 답답할 수 있어요",
                impact: .warmer
            ))
        } else if humidityChange < -15 {
            reasons.append(.init(
                icon: "💨",
                message: "습도가 낮아져 쾌적할 수 있어요",
                impact: .cooler
            ))
        }

        if windChange > 3 {
            reasons.append(.init(
                icon: "🌬",
                message: "바람이 강해져 체감이 낮아질 수 있어요",
                impact: .cooler
            ))
        }

        return reasons
    }

    /// 옷차림 기반 이유 생성
    static func buildFromClothing(
        clothingScale: Int,
        currentTemp: Double
    ) -> [PredictionChangeReason.ChangeReason] {
        var reasons: [PredictionChangeReason.ChangeReason] = []

        if clothingScale == 3 && currentTemp > 25 {
            reasons.append(.init(
                icon: "🧥",
                message: "두꺼운 옷차림이 더위를 높일 수 있어요",
                impact: .warmer
            ))
        } else if clothingScale == 1 && currentTemp < 10 {
            reasons.append(.init(
                icon: "👕",
                message: "얇은 옷차림이 추위를 높일 수 있어요",
                impact: .cooler
            ))
        }

        return reasons
    }
}
