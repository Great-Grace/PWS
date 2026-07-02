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


// MARK: - Avatar View

struct AvatarLayer: View {
    let hour: Double
    let tempC: Double
    let feelScore: Double

    @State private var floatOffset: CGFloat = 0

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

    var body: some View {
        VStack(spacing: 12) {
            ZStack {
                // 부드러운 배경 글로우
                Circle()
                    .fill(
                        RadialGradient(
                            colors: [
                                .white.opacity(0.15),
                                .clear,
                            ],
                            center: .center,
                            startRadius: 40,
                            endRadius: 120
                        )
                    )
                    .frame(width: 240, height: 240)

                // 아바타 (풀바디)
                if let poseImage = UIImage(named: poseAssetName) {
                    Image(uiImage: poseImage)
                        .resizable()
                        .aspectRatio(contentMode: .fit)
                        .frame(width: 200, height: 200)
                        .offset(y: floatOffset)
                        .shadow(color: .black.opacity(0.1), radius: 10, x: 0, y: 10)
                } else {
                    // Fallback
                    Image(systemName: "person.fill")
                        .font(.system(size: 100))
                        .foregroundStyle(.white.opacity(0.5))
                }
            }
            .accessibilityLabel("현재 아바타 모습")

            // 체감 상태 텍스트
            Text(feelText)
                .font(.system(size: 18, weight: .bold))
                .foregroundStyle(.white)
                .padding(.horizontal, 16)
                .padding(.vertical, 8)
                .background(.ultraThinMaterial)
                .clipShape(Capsule())
                .shadow(color: .black.opacity(0.1), radius: 4, x: 0, y: 2)
        }
        .onAppear {
            withAnimation(
                .easeInOut(duration: 2.0)
                .repeatForever(autoreverses: true)
            ) {
                floatOffset = -8 // 둥둥 떠다니는 애니메이션
            }
        }
    }

    private var feelText: String {
        switch AvatarMood.from(feelScore: feelScore) {
        case .freezing: return "너무 추워요"
        case .cold:     return "쌀쌀하네요"
        case .neutral:  return "기분 좋은 날씨예요"
        case .warm:     return "조금 더워요"
        case .hot:      return "너무 더워요"
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
