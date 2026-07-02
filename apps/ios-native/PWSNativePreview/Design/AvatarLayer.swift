import SwiftUI

// MARK: - Avatar Layer
// 시간대 + 기온 + 체감에 따른 아바타 표시
// 현재는 SF Symbols + 조합으로 구현
// 나중에 AI 생성 이미지로 교체 가능 (같은 인터페이스)

// MARK: - Avatar State

enum AvatarTimePhase {
    case morning, day, evening, night

    static func from(hour: Double) -> AvatarTimePhase {
        switch hour {
        case 6..<10:  return .morning
        case 10..<18: return .day
        case 18..<22: return .evening
        default:       return .night
        }
    }
}

enum AvatarTempBand {
    case freezing, cold, mild, warm, hot

    static func from(tempC: Double) -> AvatarTempBand {
        switch tempC {
        case ..<5:    return .freezing
        case 5..<13:  return .cold
        case 13..<23: return .mild
        case 23..<30: return .warm
        default:       return .hot
        }
    }
}

enum AvatarMood {
    case freezing, cold, neutral, warm, hot

    static func from(feelScore: Double) -> AvatarMood {
        switch feelScore {
        case ..<2:    return .freezing
        case 2..<3:   return .cold
        case 3..<5:   return .neutral
        case 5..<6:   return .warm
        default:       return .hot
        }
    }
}

// MARK: - Avatar Configuration

struct AvatarConfig {
    let pose: String        // SF Symbol or image name
    let outfit: String      // outfit layer image name
    let expression: String  // expression overlay
    let tintColor: Color
    let description: String // accessibility
}

struct AvatarResolver {

    static func resolve(
        hour: Double,
        tempC: Double,
        feelScore: Double
    ) -> AvatarConfig {
        let timePhase = AvatarTimePhase.from(hour: hour)
        let tempBand = AvatarTempBand.from(tempC: tempC)
        let mood = AvatarMood.from(feelScore: feelScore)

        return AvatarConfig(
            pose: poseSymbol(for: timePhase),
            outfit: outfitSymbol(for: tempBand),
            expression: expressionSymbol(for: mood),
            tintColor: tintColor(for: mood),
            description: description(for: timePhase, tempBand: tempBand, mood: mood)
        )
    }

    // MARK: - Pose (시간대)

    private static func poseSymbol(for phase: AvatarTimePhase) -> String {
        switch phase {
        case .morning: return "figure.stand"      // 아침: 서기
        case .day:     return "figure.walk"        // 낮: 활기찬 걸음
        case .evening: return "figure.stand"       // 저녁: 휴식
        case .night:   return "figure.cooldown"    // 밤: 쿨다운
        }
    }

    // MARK: - Outfit (기온)

    private static func outfitSymbol(for band: AvatarTempBand) -> String {
        switch band {
        case .freezing: return "❄"     // 두꺼운 패딩
        case .cold:     return "🧥"    // 코트
        case .mild:     return "👕"    // 긴팔/셔츠
        case .warm:     return "👔"    // 반팔
        case .hot:      return "🩳"    // 얇은 옷
        }
    }

    // MARK: - Expression (체감)

    private static func expressionSymbol(for mood: AvatarMood) -> String {
        switch mood {
        case .freezing: return "🥶"
        case .cold:     return "😊" // 추위에 움츠림
        case .neutral:  return "😌"
        case .warm:     return "😅"
        case .hot:      return "🥵"
        }
    }

    // MARK: - Tint Color

    private static func tintColor(for mood: AvatarMood) -> Color {
        switch mood {
        case .freezing: return Color(red: 0.3, green: 0.6, blue: 1.0)
        case .cold:     return Color(red: 0.5, green: 0.7, blue: 1.0)
        case .neutral:  return Color(red: 0.2, green: 0.8, blue: 0.5)
        case .warm:     return Color(red: 1.0, green: 0.7, blue: 0.3)
        case .hot:      return Color(red: 1.0, green: 0.4, blue: 0.3)
        }
    }

    // MARK: - Accessibility

    private static func description(
        for time: AvatarTimePhase,
        tempBand: AvatarTempBand,
        mood: AvatarMood
    ) -> String {
        let timeStr: String
        switch time {
        case .morning: timeStr = "아침"
        case .day:     timeStr = "낮"
        case .evening: timeStr = "저녁"
        case .night:   timeStr = "밤"
        }

        let tempStr: String
        switch tempBand {
        case .freezing: tempStr = "매우 추운"
        case .cold:     tempStr = "추운"
        case .mild:     tempStr = "선선한"
        case .warm:     tempStr = "따뜻한"
        case .hot:      tempStr = "더운"
        }

        let moodStr: String
        switch mood {
        case .freezing: moodStr = "추위에 떨고 있는"
        case .cold:     moodStr = "조금 추워하는"
        case .neutral:  moodStr = "편안한"
        case .warm:     moodStr = "조금 더워하는"
        case .hot:      moodStr = "더위에 지친"
        }

        return "\(timeStr) \(tempStr) 날씨에 \(moodStr) 모습"
    }
}

// MARK: - Avatar View

struct AvatarLayer: View {
    let hour: Double
    let tempC: Double
    let feelScore: Double

    @State private var breatheScale: CGFloat = 1.0

    private var config: AvatarConfig {
        AvatarResolver.resolve(hour: hour, tempC: tempC, feelScore: feelScore)
    }

    private var faceAssetName: String {
        switch AvatarMood.from(feelScore: feelScore) {
        case .freezing: return "avatar_face_cold_pain"
        case .cold:     return "avatar_face_cold_pain"
        case .neutral:  return "avatar_face_comfortable"
        case .warm:     return "avatar_face_sweating"
        case .hot:      return "avatar_face_hot_pain"
        }
    }

    private var poseAssetName: String {
        switch (AvatarTimePhase.from(hour: hour), AvatarTempBand.from(tempC: tempC)) {
        case (_, .freezing): return "avatar_pose_shivering"
        case (_, .cold):     return "avatar_pose_shivering"
        case (_, .hot):      return "avatar_pose_wiping"
        case (_, .warm):     return "avatar_pose_fanning"
        case (.morning, _):  return "avatar_pose_standing"
        case (.day, _):      return "avatar_pose_standing"
        case (.evening, _):  return "avatar_pose_standing"
        case (.night, _):    return "avatar_pose_standing"
        }
    }

    private var outfitAssetName: String {
        switch AvatarTempBand.from(tempC: tempC) {
        case .freezing: return "avatar_outfit_winter_padding"
        case .cold:     return "avatar_outfit_winter_coat"
        case .mild:     return "avatar_outfit_spring_cardigan"
        case .warm:     return "avatar_outfit_spring_light"
        case .hot:      return "avatar_outfit_summer_light"
        }
    }

    var body: some View {
        VStack(spacing: 8) {
            ZStack {
                // 배경 글로우
                Circle()
                    .fill(
                        RadialGradient(
                            colors: [
                                config.tintColor.opacity(0.2),
                                config.tintColor.opacity(0.05),
                                .clear,
                            ],
                            center: .center,
                            startRadius: 20,
                            endRadius: 80
                        )
                    )
                    .frame(width: 160, height: 160)

                // 아바타 본체 (에셋 있으면 이미지, 없으면 emoji/SF Symbol)
                VStack(spacing: 4) {
                    // 표정 — 이미지 에셋 우선, 없으면 emoji
                    if let faceImage = UIImage(named: faceAssetName) {
                        Image(uiImage: faceImage)
                            .resizable()
                            .aspectRatio(contentMode: .fit)
                            .frame(width: 80, height: 80)
                            .scaleEffect(breatheScale)
                            .contentTransition(.opacity)
                    } else {
                        Text(config.expression)
                            .font(.system(size: 48))
                            .scaleEffect(breatheScale)
                            .contentTransition(.opacity)
                    }

                    // 포즈 — 이미지 에셋 우선, 없으면 SF Symbol
                    if let poseImage = UIImage(named: poseAssetName) {
                        Image(uiImage: poseImage)
                            .resizable()
                            .aspectRatio(contentMode: .fit)
                            .frame(width: 64, height: 64)
                            .contentTransition(.opacity)
                    } else {
                        Image(systemName: config.pose)
                            .font(.system(size: 36, weight: .light))
                            .foregroundStyle(config.tintColor)
                            .contentTransition(.opacity)
                    }
                }
                .accessibilityLabel(config.description)
            }

            // 옷차림 + 체감 텍스트
            HStack(spacing: 6) {
                if let outfitImage = UIImage(named: outfitAssetName) {
                    Image(uiImage: outfitImage)
                        .resizable()
                        .aspectRatio(contentMode: .fit)
                        .frame(width: 20, height: 20)
                } else {
                    Text(config.outfit)
                        .font(.system(size: 14))
                }
                Text(feelText)
                    .font(.system(size: 13, weight: .medium))
                    .foregroundStyle(.white.opacity(0.8))
                    .contentTransition(.opacity)
            }
            .padding(.horizontal, 12)
            .padding(.vertical, 6)
            .background(.ultraThinMaterial)
            .clipShape(Capsule())
        }
        .onAppear {
            withAnimation(
                .easeInOut(duration: 2.5)
                .repeatForever(autoreverses: true)
            ) {
                breatheScale = 1.05
            }
        }
        .animation(.easeInOut(duration: 0.5), value: tempC)
    }

    private var feelText: String {
        switch AvatarMood.from(feelScore: feelScore) {
        case .freezing: return "매우 추워요"
        case .cold:     return "쌀쌀해요"
        case .neutral:  return "쾌적해요"
        case .warm:     return "따뜻해요"
        case .hot:      return "더워요"
        }
    }
}

// MARK: - Temperature Breath Effect (추위/더위 시각 효과)

struct TemperatureBreathEffect: View {
    let tempC: Double

    var body: some View {
        ZStack {
            if breathOpacity > 0 {
                BreathParticles()
                    .opacity(breathOpacity)
            }
            if shimmerOpacity > 0 {
                HeatShimmerEffect()
                    .opacity(shimmerOpacity)
            }
        }
        .animation(.easeInOut(duration: 0.8), value: tempC)
    }

    private var breathOpacity: Double {
        // 8°C 이하에서 서서히 나타남, 3°C에서 최대
        if tempC >= 8 { return 0 }
        if tempC <= 3 { return 0.5 }
        return 0.5 * (8 - tempC) / 5
    }

    private var shimmerOpacity: Double {
        // 28°C 이상에서 서서히 나타남, 35°C에서 최대
        if tempC <= 28 { return 0 }
        if tempC >= 35 { return 0.35 }
        return 0.35 * (tempC - 28) / 7
    }
}

private struct BreathParticles: View {
    @State private var particles: [(x: CGFloat, y: CGFloat, opacity: Double, scale: CGFloat)] = []

    private let timer = Timer.publish(every: 0.3, on: .main, in: .common).autoconnect()

    var body: some View {
        Canvas { context, size in
            for particle in particles {
                let center = CGPoint(
                    x: size.width * 0.5 + particle.x,
                    y: size.height * 0.3 + particle.y
                )
                let rect = CGRect(
                    x: center.x - 8 * particle.scale,
                    y: center.y - 8 * particle.scale,
                    width: 16 * particle.scale,
                    height: 16 * particle.scale
                )
                context.opacity = particle.opacity
                context.fill(
                    Path(ellipseIn: rect),
                    with: .color(.white)
                )
            }
        }
        .onReceive(timer) { _ in
            updateParticles()
        }
    }

    private func updateParticles() {
        // 새 파티클 추가
        if particles.count < 5 {
            particles.append((
                x: CGFloat.random(in: -10...10),
                y: 0,
                opacity: 0.5,
                scale: CGFloat.random(in: 0.5...1.0)
            ))
        }

        // 기존 파티클 업데이트
        for i in particles.indices {
            particles[i].y -= 8
            particles[i].x += CGFloat.random(in: -3...3)
            particles[i].opacity -= 0.08
            particles[i].scale += 0.05
        }

        // 투명한 파티클 제거
        particles.removeAll { $0.opacity <= 0 }
    }
}

private struct HeatShimmerEffect: View {
    @State private var phase: CGFloat = 0

    private let timer = Timer.publish(every: 0.05, on: .main, in: .common).autoconnect()

    var body: some View {
        Canvas { context, size in
            let waveHeight: CGFloat = 3
            let waveLength: CGFloat = 40

            for y in stride(from: 0, to: size.height, by: 8) {
                var path = Path()
                path.move(to: CGPoint(x: 0, y: y))
                for x in stride(from: 0, to: size.width, by: 4) {
                    let offsetY = sin((x / waveLength) + phase + y * 0.05) * waveHeight
                    path.addLine(to: CGPoint(x: x, y: y + offsetY))
                }
                context.opacity = 0.08
                context.stroke(path, with: .color(.white), lineWidth: 1)
            }
        }
        .onReceive(timer) { _ in
            phase += 0.15
        }
    }
}
