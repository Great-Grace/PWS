import SwiftUI

// MARK: - Feel Trajectory Chart
// 하루 동안의 체감 예측 변화를 곡선으로 표현

struct FeelTrajectoryChart: View {
    let dataPoints: [TrajectoryPoint]
    let currentHour: Double

    struct TrajectoryPoint: Equatable {
        let hour: Double        // 0~24
        let feel: Double        // 1~7
        let confidence: Double  // 0~1 (신뢰도 높을수록 밴드 좁음)
        let weatherCode: Int?
    }

    @State private var animationProgress: CGFloat = 0

    var body: some View {
        VStack(alignment: .leading, spacing: PWSTokens.spacing12) {
            Text("오늘 체감 변화 예측")
                .font(.system(size: 14, weight: .semibold))
                .foregroundStyle(.white.opacity(0.7))

            GeometryReader { geometry in
                let width = geometry.size.width
                let height = geometry.size.height
                let padding: CGFloat = 20
                let chartWidth = width - padding * 2
                let chartHeight = height - padding * 2

                ZStack {
                    // Y축 가이드라인
                    yAxisGuides(width: chartWidth, height: chartHeight, padding: padding)

                    // X축 시간 라벨
                    xAxisLabels(width: chartWidth, height: chartHeight, padding: padding)

                    // 신뢰도 밴드 (반투명 영역)
                    confidenceBand(width: chartWidth, height: chartHeight, padding: padding)

                    // 메인 곡선
                    trajectoryLine(width: chartWidth, height: chartHeight, padding: padding)

                    // 데이터 포인트
                    dataPoints(width: chartWidth, height: chartHeight, padding: padding)

                    // 현재 시간 마커
                    currentTimeMarker(width: chartWidth, height: chartHeight, padding: padding)
                }
            }
            .frame(height: 180)
        }
        .padding(PWSTokens.spacing16)
        .background(.ultraThinMaterial.opacity(0.25))
        .clipShape(RoundedRectangle(cornerRadius: PWSTokens.radius, style: .continuous))
        .accessibilityElement(children: .ignore)
        .accessibilityLabel("체감 변화 예측 그래프")
        .accessibilityValue(trajectoryDescription)
        .onAppear {
            withAnimation(.easeOut(duration: 1.0)) {
                animationProgress = 1.0
            }
        }
    }

    // MARK: - Y Axis Guides

    private func yAxisGuides(width: CGFloat, height: CGFloat, padding: CGFloat) -> some View {
        ForEach([2, 3, 4, 5, 6], id: \.self) { level in
            let y = padding + height * (1 - CGFloat(level - 1) / 6)
            Path { path in
                path.move(to: CGPoint(x: padding, y: y))
                path.addLine(to: CGPoint(x: padding + width, y: y))
            }
            .stroke(.white.opacity(0.08), style: StrokeStyle(lineWidth: 1, dash: [4, 4]))

            Text("\(level)")
                .font(.system(size: 9, weight: .medium))
                .foregroundStyle(.white.opacity(0.3))
                .position(x: padding - 10, y: y)
        }
    }

    // MARK: - X Axis Labels

    private func xAxisLabels(width: CGFloat, height: CGFloat, padding: CGFloat) -> some View {
        let hours = [6, 9, 12, 15, 18, 21]
        return ForEach(hours, id: \.self) { hour in
            let x = padding + width * CGFloat(hour - 6) / 16
            Text("\(hour)시")
                .font(.system(size: 9, weight: .medium))
                .foregroundStyle(.white.opacity(0.4))
                .position(x: x, y: padding + height + 14)
        }
    }

    // MARK: - Confidence Band

    private func confidenceBand(width: CGFloat, height: CGFloat, padding: CGFloat) -> some View {
        let points = scaledPoints(width: width, height: height, padding: padding)

        return Path { path in
            guard points.count >= 2 else { return }

            // 상단 경계 (높은 confidence = 좁은 밴드)
            let upperPoints = points.enumerated().map { index, point in
                let confidence = dataPoints.indices.contains(index) ? dataPoints[index].confidence : 0.5
                let bandHeight = (1 - confidence) * 30 + 5
                return CGPoint(x: point.x, y: point.y - bandHeight)
            }

            // 하단 경계
            let lowerPoints = points.enumerated().map { index, point in
                let confidence = dataPoints.indices.contains(index) ? dataPoints[index].confidence : 0.5
                let bandHeight = (1 - confidence) * 30 + 5
                return CGPoint(x: point.x, y: point.y + bandHeight)
            }

            // 상단 → 하단 (역순)으로 채우기
            path.addLines(upperPoints)
            path.addLine(to: lowerPoints.last!)
            for point in lowerPoints.reversed() {
                path.addLine(to: point)
            }
            path.closeSubpath()
        }
        .fill(
            LinearGradient(
                colors: [.white.opacity(0.12), .white.opacity(0.03)],
                startPoint: .top,
                endPoint: .bottom
            )
        )
    }

    // MARK: - Trajectory Line

    private func trajectoryLine(width: CGFloat, height: CGFloat, padding: CGFloat) -> some View {
        let points = scaledPoints(width: width, height: height, padding: padding)

        return Path { path in
            guard let first = points.first else { return }
            path.move(to: first)

            if points.count >= 2 {
                // Cubic bezier 보간으로 부드러운 곡선
                for i in 1..<points.count {
                    let prev = points[i - 1]
                    let curr = points[i]
                    let midX = (prev.x + curr.x) / 2

                    path.addCurve(
                        to: curr,
                        control1: CGPoint(x: midX, y: prev.y),
                        control2: CGPoint(x: midX, y: curr.y)
                    )
                }
            }
        }
        .trim(from: 0, to: animationProgress)
        .stroke(
            LinearGradient(
                colors: [
                    Color(red: 0.3, green: 0.6, blue: 1.0),
                    Color(red: 0.3, green: 0.85, blue: 0.5),
                    Color(red: 1.0, green: 0.7, blue: 0.3),
                    Color(red: 1.0, green: 0.4, blue: 0.3),
                ],
                startPoint: .leading,
                endPoint: .trailing
            ),
            style: StrokeStyle(lineWidth: 3, lineCap: .round, lineJoin: .round)
        )
    }

    // MARK: - Data Points

    private func dataPoints(width: CGFloat, height: CGFloat, padding: CGFloat) -> some View {
        let points = scaledPoints(width: width, height: height, padding: padding)

        return ForEach(Array(points.enumerated()), id: \.offset) { index, point in
            Circle()
                .fill(.white)
                .frame(width: 8, height: 8)
                .shadow(color: .black.opacity(0.15), radius: 2, x: 0, y: 1)
                .overlay(
                    Circle()
                        .fill(pointColor(index: index))
                        .frame(width: 5, height: 5)
                )
                .position(point)
                .opacity(Double(index) / Double(max(points.count - 1, 1)) <= animationProgress ? 1 : 0)
        }
    }

    // MARK: - Current Time Marker

    private func currentTimeMarker(width: CGFloat, height: CGFloat, padding: CGFloat) -> some View {
        let x = padding + width * max(0, min(1, (currentHour - 6) / 16))

        return VStack(spacing: 2) {
            Rectangle()
                .fill(.white.opacity(0.5))
                .frame(width: 1, height: height)

            Text("지금")
                .font(.system(size: 9, weight: .bold))
                .foregroundStyle(.white)
                .padding(.horizontal, 6)
                .padding(.vertical, 2)
                .background(Color(red: 1.0, green: 0.4, blue: 0.3))
                .clipShape(Capsule())
        }
        .position(x: x, y: padding + height / 2)
    }

    // MARK: - Helpers

    private func scaledPoints(width: CGFloat, height: CGFloat, padding: CGFloat) -> [CGPoint] {
        dataPoints.map { point in
            let x = padding + width * max(0, min(1, (point.hour - 6) / 16))
            let y = padding + height * (1 - max(0, min(1, (point.feel - 1) / 6)))
            return CGPoint(x: x, y: y)
        }
    }

    private var trajectoryDescription: String {
        guard !dataPoints.isEmpty else { return "데이터 없음" }
        let values = dataPoints.map { $0.feel }
        let minVal = values.min() ?? 0
        let maxVal = values.max() ?? 0
        return "최저 \(String(format: "%.1f", minVal))점부터 최고 \(String(format: "%.1f", maxVal))점까지 변화"
    }

    private func pointColor(index: Int) -> Color {
        guard dataPoints.indices.contains(index) else { return .white }
        let feel = dataPoints[index].feel
        switch feel {
        case ..<2:    return Color(red: 0.3, green: 0.5, blue: 1.0)
        case ..<3:    return Color(red: 0.4, green: 0.65, blue: 1.0)
        case ..<4:    return Color(red: 0.3, green: 0.8, blue: 0.6)
        case ..<5:    return Color(red: 0.4, green: 0.85, blue: 0.4)
        case ..<6:    return Color(red: 1.0, green: 0.7, blue: 0.3)
        default:      return Color(red: 1.0, green: 0.4, blue: 0.3)
        }
    }
}
