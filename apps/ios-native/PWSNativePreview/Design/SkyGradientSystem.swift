import SwiftUI

// MARK: - Sky Gradient System
// 시간(0~24)과 날씨 상태에 따른 하늘 그라디언트 엔진
// 코드 기반, 이미지 자산 불필요

struct SkyGradientColors {
    let top: Color
    let middle: Color
    let bottom: Color
    let atmosphere: Color // 전체 tint (기온 효과)
}

enum SkyTimePhase: String, CaseIterable {
    case deepNight = "night"    // 00-05
    case dawn       // 05-07
    case morning    // 07-10
    case midday     // 10-14
    case afternoon  // 14-17
    case goldenHour = "sunset"  // 17-19
    case dusk       // 19-21
    case night      // 21-24

    static func from(hour: Double) -> SkyTimePhase {
        switch hour {
        case 0..<5:    return .deepNight
        case 5..<7:    return .dawn
        case 7..<10:   return .morning
        case 10..<14:  return .midday
        case 14..<17:  return .afternoon
        case 17..<19:  return .goldenHour
        case 19..<21:  return .dusk
        default:        return .night
        }
    }
}

struct SkyGradientSystem {

    // MARK: - Base sky colors by time phase

    static func baseColors(for phase: SkyTimePhase) -> SkyGradientColors {
        switch phase {
        case .deepNight:
            return SkyGradientColors(
                top: Color(red: 0.05, green: 0.05, blue: 0.15),
                middle: Color(red: 0.08, green: 0.08, blue: 0.20),
                bottom: Color(red: 0.10, green: 0.10, blue: 0.18),
                atmosphere: Color(red: 0.06, green: 0.06, blue: 0.12)
            )
        case .dawn:
            return SkyGradientColors(
                top: Color(red: 0.25, green: 0.20, blue: 0.45),
                middle: Color(red: 0.60, green: 0.35, blue: 0.40),
                bottom: Color(red: 0.95, green: 0.65, blue: 0.35),
                atmosphere: Color(red: 0.90, green: 0.70, blue: 0.50).opacity(0.15)
            )
        case .morning:
            return SkyGradientColors(
                top: Color(red: 0.40, green: 0.60, blue: 0.90),
                middle: Color(red: 0.55, green: 0.72, blue: 0.95),
                bottom: Color(red: 0.85, green: 0.90, blue: 0.95),
                atmosphere: Color.clear
            )
        case .midday:
            return SkyGradientColors(
                top: Color(red: 0.25, green: 0.50, blue: 0.90),
                middle: Color(red: 0.45, green: 0.65, blue: 0.95),
                bottom: Color(red: 0.75, green: 0.85, blue: 0.95),
                atmosphere: Color.clear
            )
        case .afternoon:
            return SkyGradientColors(
                top: Color(red: 0.30, green: 0.55, blue: 0.88),
                middle: Color(red: 0.50, green: 0.68, blue: 0.92),
                bottom: Color(red: 0.80, green: 0.88, blue: 0.92),
                atmosphere: Color.clear
            )
        case .goldenHour:
            return SkyGradientColors(
                top: Color(red: 0.35, green: 0.40, blue: 0.70),
                middle: Color(red: 0.80, green: 0.50, blue: 0.35),
                bottom: Color(red: 0.98, green: 0.75, blue: 0.40),
                atmosphere: Color(red: 1.0, green: 0.80, blue: 0.40).opacity(0.10)
            )
        case .dusk:
            return SkyGradientColors(
                top: Color(red: 0.15, green: 0.12, blue: 0.35),
                middle: Color(red: 0.40, green: 0.25, blue: 0.50),
                bottom: Color(red: 0.70, green: 0.40, blue: 0.45),
                atmosphere: Color(red: 0.50, green: 0.30, blue: 0.50).opacity(0.08)
            )
        case .night:
            return SkyGradientColors(
                top: Color(red: 0.06, green: 0.06, blue: 0.18),
                middle: Color(red: 0.10, green: 0.10, blue: 0.25),
                bottom: Color(red: 0.12, green: 0.12, blue: 0.22),
                atmosphere: Color(red: 0.08, green: 0.08, blue: 0.15)
            )
        }
    }

    // MARK: - Weather modifier (날씨에 따른 하늘 변화)

    static func weatherModifier(code: Int, intensity: Double) -> (topShift: Color, bottomShift: Color, opacity: Double) {
        switch code {
        case 200...299: // 뇌우
            return (
                topShift: Color(red: 0.15, green: 0.10, blue: 0.20),
                bottomShift: Color(red: 0.20, green: 0.18, blue: 0.25),
                opacity: 0.6 * intensity
            )
        case 300...399: // 이슬비
            return (
                topShift: Color(red: 0.50, green: 0.52, blue: 0.58),
                bottomShift: Color(red: 0.60, green: 0.62, blue: 0.65),
                opacity: 0.3 * intensity
            )
        case 500...599: // 비
            return (
                topShift: Color(red: 0.35, green: 0.38, blue: 0.48),
                bottomShift: Color(red: 0.45, green: 0.48, blue: 0.55),
                opacity: 0.5 * intensity
            )
        case 600...699: // 눈
            return (
                topShift: Color(red: 0.70, green: 0.72, blue: 0.80),
                bottomShift: Color(red: 0.85, green: 0.87, blue: 0.92),
                opacity: 0.4 * intensity
            )
        case 700...799: // 안개
            return (
                topShift: Color(red: 0.65, green: 0.65, blue: 0.68),
                bottomShift: Color(red: 0.75, green: 0.75, blue: 0.78),
                opacity: 0.5 * intensity
            )
        case 801...802: // 부분 흐림
            return (
                topShift: Color(red: 0.55, green: 0.58, blue: 0.65),
                bottomShift: Color(red: 0.65, green: 0.68, blue: 0.72),
                opacity: 0.15
            )
        case 803...899: // 흐림
            return (
                topShift: Color(red: 0.50, green: 0.52, blue: 0.58),
                bottomShift: Color(red: 0.60, green: 0.62, blue: 0.65),
                opacity: 0.3
            )
        default: // 맑음
            return (topShift: .clear, bottomShift: .clear, opacity: 0)
        }
    }

    // MARK: - Temperature atmosphere (기온에 따른 분위기)

    static func temperatureTint(tempC: Double) -> Color {
        switch tempC {
        case ..<5:
            return Color(red: 0.60, green: 0.75, blue: 1.0).opacity(0.12) // 차가운 블루
        case 5..<15:
            return Color(red: 0.70, green: 0.80, blue: 0.95).opacity(0.06)
        case 15..<25:
            return Color.clear // 중립
        case 25..<32:
            return Color(red: 1.0, green: 0.85, blue: 0.60).opacity(0.08) // 따뜻한 옐로우
        default:
            return Color(red: 1.0, green: 0.70, blue: 0.50).opacity(0.12) // 핫 오렌지
        }
    }

    // MARK: - Interpolation

    static func interpolateColors(
        from: SkyGradientColors,
        to: SkyGradientColors,
        progress: Double
    ) -> SkyGradientColors {
        let t = max(0, min(1, progress))
        return SkyGradientColors(
            top: from.top.mixed(with: to.top, by: t),
            middle: from.middle.mixed(with: to.middle, by: t),
            bottom: from.bottom.mixed(with: to.bottom, by: t),
            atmosphere: from.atmosphere.mixed(with: to.atmosphere, by: t)
        )
    }

    /// 연속 시간(0~24)에서 그라디언트 색상 계산
    static func gradientColors(hour: Double, weatherCode: Int = 800, tempC: Double = 20) -> SkyGradientColors {
        let currentPhase = SkyTimePhase.from(hour: hour)
        let base = baseColors(for: currentPhase)

        // 인접 phase와 보간
        let phaseStart = phaseStartTime(currentPhase)
        let phaseEnd = phaseEndTime(currentPhase)
        let phaseDuration = phaseEnd - phaseStart
        let progress = phaseDuration > 0 ? (hour - phaseStart) / phaseDuration : 0

        let nextPhase = nextPhase(after: currentPhase)
        let nextBase = baseColors(for: nextPhase)
        let blended = interpolateColors(from: base, to: nextBase, progress: max(0, min(1, progress)))

        // 날씨 modifier 적용
        let weather = weatherModifier(code: weatherCode, intensity: 1.0)
        let weatherBlended = SkyGradientColors(
            top: blended.top.mixed(with: weather.topShift, by: weather.opacity),
            middle: blended.middle.mixed(with: weather.topShift, by: weather.opacity * 0.7),
            bottom: blended.bottom.mixed(with: weather.bottomShift, by: weather.opacity),
            atmosphere: blended.atmosphere.mixed(with: temperatureTint(tempC: tempC), by: 0.5)
        )

        return weatherBlended
    }

    // MARK: - Phase timing helpers

    private static func phaseStartTime(_ phase: SkyTimePhase) -> Double {
        switch phase {
        case .deepNight:  return 0
        case .dawn:       return 5
        case .morning:    return 7
        case .midday:     return 10
        case .afternoon:  return 14
        case .goldenHour: return 17
        case .dusk:       return 19
        case .night:      return 21
        }
    }

    private static func phaseEndTime(_ phase: SkyTimePhase) -> Double {
        switch phase {
        case .deepNight:  return 5
        case .dawn:       return 7
        case .morning:    return 10
        case .midday:     return 14
        case .afternoon:  return 17
        case .goldenHour: return 19
        case .dusk:       return 21
        case .night:      return 24
        }
    }

    private static func nextPhase(after phase: SkyTimePhase) -> SkyTimePhase {
        let all = SkyTimePhase.allCases
        guard let index = all.firstIndex(of: phase) else { return .deepNight }
        return all[(index + 1) % all.count]
    }
}

// MARK: - SwiftUI View

struct SkyGradientView: View {
    let hour: Double
    let weatherCode: Int
    let tempC: Double

    var body: some View {
        let colors = SkyGradientSystem.gradientColors(
            hour: hour,
            weatherCode: weatherCode,
            tempC: tempC
        )
        LinearGradient(
            stops: [
                .init(color: colors.top, location: 0),
                .init(color: colors.middle, location: 0.45),
                .init(color: colors.bottom, location: 1.0),
            ],
            startPoint: .top,
            endPoint: .bottom
        )
        .overlay(colors.atmosphere.ignoresSafeArea())
        .ignoresSafeArea()
        .animation(.easeInOut(duration: 0.8), value: hour)
    }
}

// MARK: - Color mixing helper

extension Color {
    func mixed(with other: Color, by t: Double) -> Color {
        let clamped = max(0, min(1, t))
        guard clamped > 0 else { return self }
        guard clamped < 1 else { return other }

        var r1: CGFloat = 0, g1: CGFloat = 0, b1: CGFloat = 0, a1: CGFloat = 0
        var r2: CGFloat = 0, g2: CGFloat = 0, b2: CGFloat = 0, a2: CGFloat = 0

        guard UIColor(self).getRed(&r1, green: &g1, blue: &b1, alpha: &a1),
              UIColor(other).getRed(&r2, green: &g2, blue: &b2, alpha: &a2) else {
            return self
        }

        return Color(
            red: Double(r1 + (r2 - r1) * clamped),
            green: Double(g1 + (g2 - g1) * clamped),
            blue: Double(b1 + (b2 - b1) * clamped),
            opacity: Double(a1 + (a2 - a1) * clamped)
        )
    }
}
