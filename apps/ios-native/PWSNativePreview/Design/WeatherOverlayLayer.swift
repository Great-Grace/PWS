import SwiftUI

// MARK: - Weather Overlay Layer
// 날씨 코드에 따른 파티클/오버레이 효과
// 모든 날씨 타입을 ZStack으로 겹쳐서 opacity로 전환 → 부드러운 크로스페이드

enum WeatherOverlayType {
    case clear
    case clouds(thin: Bool)
    case rain(intensity: Double)
    case snow(intensity: Double)
    case fog(opacity: Double)
    case thunderstorm

    static func from(weatherCode: Int) -> WeatherOverlayType {
        switch weatherCode {
        case 200...299: return .thunderstorm
        case 300...399: return .rain(intensity: 0.3)
        case 500...501: return .rain(intensity: 0.4)
        case 502...504: return .rain(intensity: 0.7)
        case 511:       return .rain(intensity: 0.5)
        case 520...531: return .rain(intensity: 0.6)
        case 600...601: return .snow(intensity: 0.4)
        case 602...622: return .snow(intensity: 0.7)
        case 700...799: return .fog(opacity: 0.5)
        case 801:       return .clouds(thin: true)
        case 802:       return .clouds(thin: true)
        case 803...804: return .clouds(thin: false)
        default:        return .clear
        }
    }
}

// MARK: - Rain Particles

struct RainOverlayView: View {
    let intensity: Double
    @State private var particles: [RainParticle] = []

    private let timer = Timer.publish(every: 0.05, on: .main, in: .common).autoconnect()

    var body: some View {
        Canvas { context, size in
            for particle in particles {
                let rect = CGRect(
                    x: particle.x * size.width,
                    y: particle.y * size.height,
                    width: 1.5,
                    height: particle.length
                )
                let path = Path(roundedRect: rect, cornerRadius: 0.5)
                context.opacity = particle.opacity
                context.fill(path, with: .color(.white.opacity(0.4)))
            }
        }
        .onReceive(timer) { _ in updateParticles() }
        .onAppear { generateInitialParticles() }
    }

    private func generateInitialParticles() {
        let count = Int(intensity * 80)
        particles = (0..<count).map { _ in RainParticle.random() }
    }

    private func updateParticles() {
        for i in particles.indices {
            particles[i].y += particles[i].speed
            particles[i].x += particles[i].drift
            if particles[i].y > 1.1 {
                particles[i] = RainParticle.random()
                particles[i].y = -0.05
            }
        }
    }
}

private struct RainParticle {
    var x: Double
    var y: Double
    var speed: Double
    var drift: Double
    var length: Double
    var opacity: Double

    static func random() -> RainParticle {
        RainParticle(
            x: Double.random(in: 0...1),
            y: Double.random(in: -0.1...1.0),
            speed: Double.random(in: 0.015...0.035),
            drift: Double.random(in: -0.002...0.001),
            length: Double.random(in: 8...16),
            opacity: Double.random(in: 0.2...0.5)
        )
    }
}

// MARK: - Snow Particles

struct SnowOverlayView: View {
    let intensity: Double
    @State private var particles: [SnowParticle] = []

    private let timer = Timer.publish(every: 0.06, on: .main, in: .common).autoconnect()

    var body: some View {
        Canvas { context, size in
            for particle in particles {
                let center = CGPoint(
                    x: particle.x * size.width,
                    y: particle.y * size.height
                )
                let rect = CGRect(
                    x: center.x - particle.radius,
                    y: center.y - particle.radius,
                    width: particle.radius * 2,
                    height: particle.radius * 2
                )
                context.opacity = particle.opacity
                context.fill(Path(ellipseIn: rect), with: .color(.white))
            }
        }
        .onReceive(timer) { _ in updateParticles() }
        .onAppear { generateInitialParticles() }
    }

    private func generateInitialParticles() {
        let count = Int(intensity * 60)
        particles = (0..<count).map { _ in SnowParticle.random() }
    }

    private func updateParticles() {
        for i in particles.indices {
            particles[i].y += particles[i].fallSpeed
            particles[i].x += sin(particles[i].wobblePhase) * 0.002
            particles[i].wobblePhase += 0.1
            if particles[i].y > 1.1 {
                particles[i] = SnowParticle.random()
                particles[i].y = -0.05
            }
        }
    }
}

private struct SnowParticle {
    var x: Double
    var y: Double
    var fallSpeed: Double
    var radius: Double
    var opacity: Double
    var wobblePhase: Double

    static func random() -> SnowParticle {
        SnowParticle(
            x: Double.random(in: 0...1),
            y: Double.random(in: -0.1...1.0),
            fallSpeed: Double.random(in: 0.003...0.008),
            radius: Double.random(in: 2...5),
            opacity: Double.random(in: 0.4...0.8),
            wobblePhase: Double.random(in: 0...(2 * .pi))
        )
    }
}

// MARK: - Fog Overlay

struct FogOverlayView: View {
    let opacity: Double
    @State private var offset: CGFloat = 0

    private let timer = Timer.publish(every: 0.1, on: .main, in: .common).autoconnect()

    var body: some View {
        ZStack {
            RadialGradient(
                colors: [
                    .white.opacity(opacity * 0.3),
                    .white.opacity(opacity * 0.1),
                    .clear,
                ],
                center: UnitPoint(x: 0.3 + offset * 0.1, y: 0.7),
                startRadius: 50,
                endRadius: 300
            )
            RadialGradient(
                colors: [
                    .white.opacity(opacity * 0.25),
                    .white.opacity(opacity * 0.08),
                    .clear,
                ],
                center: UnitPoint(x: 0.7 - offset * 0.08, y: 0.5),
                startRadius: 80,
                endRadius: 350
            )
        }
        .onReceive(timer) { _ in
            withAnimation(.linear(duration: 0.1)) {
                offset = offset > 2 ? 0 : offset + 0.01
            }
        }
    }
}

// MARK: - Cloud Overlay

struct CloudOverlayView: View {
    let thin: Bool
    @State private var drift: CGFloat = 0

    private let timer = Timer.publish(every: 0.15, on: .main, in: .common).autoconnect()

    var body: some View {
        let baseOpacity = thin ? 0.08 : 0.18
        ZStack {
            Ellipse()
                .fill(.white.opacity(baseOpacity))
                .frame(width: 200, height: 60)
                .offset(x: -40 + drift, y: -80)
                .blur(radius: 20)
            Ellipse()
                .fill(.white.opacity(baseOpacity * 0.8))
                .frame(width: 160, height: 45)
                .offset(x: 60 + drift * 0.7, y: -120)
                .blur(radius: 25)
            if !thin {
                Ellipse()
                    .fill(.white.opacity(baseOpacity * 0.6))
                    .frame(width: 180, height: 50)
                    .offset(x: -10 + drift * 1.2, y: -40)
                    .blur(radius: 18)
            }
        }
        .onReceive(timer) { _ in
            withAnimation(.linear(duration: 0.15)) {
                drift = drift > 60 ? -60 : drift + 0.3
            }
        }
    }
}

// MARK: - Thunderstorm Flash

struct ThunderstormOverlayView: View {
    @State private var flashOpacity: Double = 0

    private let timer = Timer.publish(every: 3, on: .main, in: .common).autoconnect()

    var body: some View {
        ZStack {
            CloudOverlayView(thin: false).opacity(0.8)
            RainOverlayView(intensity: 0.8)
            Color.white.opacity(flashOpacity).ignoresSafeArea()
        }
        .onReceive(timer) { _ in triggerFlash() }
    }

    private func triggerFlash() {
        guard Double.random(in: 0...1) > 0.4 else { return }
        withAnimation(.easeIn(duration: 0.05)) { flashOpacity = 0.3 }
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.08) {
            withAnimation(.easeOut(duration: 0.3)) { flashOpacity = 0 }
        }
        if Double.random(in: 0...1) > 0.5 {
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.2) {
                withAnimation(.easeIn(duration: 0.03)) { flashOpacity = 0.2 }
                DispatchQueue.main.asyncAfter(deadline: .now() + 0.06) {
                    withAnimation(.easeOut(duration: 0.25)) { flashOpacity = 0 }
                }
            }
        }
    }
}

// MARK: - Composite Weather Overlay (크로스페이드 적용)

struct WeatherOverlayLayer: View {
    let weatherCode: Int

    var body: some View {
        // 모든 오버레이를 ZStack으로 겹쳐서 opacity로 전환
        // → 날씨 코드 변경 시 부드러운 크로스페이드
        ZStack {
            // 구름 (흐린 날씨 이상)
            CloudOverlayView(thin: true)
                .opacity(cloudOpacity(thin: true))

            CloudOverlayView(thin: false)
                .opacity(cloudOpacity(thin: false))

            // 비
            RainOverlayView(intensity: rainIntensity)
                .opacity(rainOpacity)

            // 눈
            SnowOverlayView(intensity: snowIntensity)
                .opacity(snowOpacity)

            // 안개
            FogOverlayView(opacity: 0.5)
                .opacity(fogOpacity)

            // 번개 (뇌우)
            thunderOverlay
                .opacity(thunderOpacity)
        }
        .animation(.easeInOut(duration: 1.5), value: weatherCode)
    }

    // MARK: - Opacity Calculations

    private func cloudOpacity(thin: Bool) -> Double {
        switch weatherCode {
        case 801...802: return thin ? 1.0 : 0
        case 803...804: return thin ? 0.5 : 1.0
        case 500...699: return thin ? 0.6 : 0  // 비/눈 시 얇은 구름
        default:        return 0
        }
    }

    private var rainIntensity: Double {
        switch weatherCode {
        case 300...399: return 0.3
        case 500...501: return 0.4
        case 502...504: return 0.7
        case 511:       return 0.5
        case 520...531: return 0.6
        case 200...299: return 0.8
        default:        return 0
        }
    }

    private var rainOpacity: Double {
        (500...599).contains(weatherCode) || (200...299).contains(weatherCode) || (300...399).contains(weatherCode) ? 1.0 : 0
    }

    private var snowIntensity: Double {
        switch weatherCode {
        case 600...601: return 0.4
        case 602...622: return 0.7
        default:        return 0
        }
    }

    private var snowOpacity: Double {
        (600...699).contains(weatherCode) ? 1.0 : 0
    }

    private var fogOpacity: Double {
        (700...799).contains(weatherCode) ? 1.0 : 0
    }

    private var thunderOpacity: Double {
        (200...299).contains(weatherCode) ? 1.0 : 0
    }

    @ViewBuilder
    private var thunderOverlay: some View {
        if (200...299).contains(weatherCode) {
            ThunderstormOverlayView()
        } else {
            EmptyView()
        }
    }
}
