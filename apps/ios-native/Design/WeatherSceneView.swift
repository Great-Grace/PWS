import SwiftUI

struct WeatherSceneView<Content: View>: View {
    let weatherState: WeatherRepositoryState
    let feedbackState: FeedbackRepositoryState
    let predictionResult: PredictionResult?
    @Binding var selectedHour: Double
    @ViewBuilder let bottomContent: Content

    private var currentTemp: Double { weatherState.data?.current.temp ?? 20 }
    private var currentWeatherCode: Int { weatherState.data?.current.weatherCode ?? 800 }

    private var currentFeelScore: Double {
        if let prediction = predictionResult {
            if selectedHour < 10 { return prediction.bySlot[.morning] ?? prediction.overall }
            else if selectedHour < 18 { return prediction.bySlot[.afternoon] ?? prediction.overall }
            else { return prediction.bySlot[.evening] ?? prediction.overall }
        }
        return weatherState.data?.current.feelsLike ?? currentTemp
    }

    private var hourlyForecasts: [HourlyForecastSnapshot] {
        guard let hourly = weatherState.data?.hourly else { return [] }
        return HourlyForecastSnapshot.from(nativeHourly: hourly)
    }

    private var selectedTimeWeather: (temp: Double, code: Int, humidity: Int, wind: Double) {
        if let closest = hourlyForecasts.min(by: { abs($0.hour - selectedHour) < abs($1.hour - selectedHour) }) {
            return (closest.temp, closest.weatherCode, closest.humidity, closest.windSpeed)
        }
        return (currentTemp, currentWeatherCode, 50, 3.0)
    }

    var body: some View {
        ZStack {
            // 풀스크린 배경
            skyBackgroundLayer
            WeatherOverlayLayer(weatherCode: selectedTimeWeather.code).allowsHitTesting(false)
            TemperatureBreathEffect(tempC: selectedTimeWeather.temp).allowsHitTesting(false)

            ScrollView {
                VStack(spacing: 0) {
                    // 상단 Hero 영역
                    VStack(spacing: 0) {
                        TimeScrollbar(selectedHour: $selectedHour, hourlyForecasts: hourlyForecasts)
                            .padding(.top, 60)
                            .padding(.bottom, 24)

                        compactWeatherHeader
                        
                        if let error = weatherState.error {
                            PWSStatusBanner(title: "날씨 오류", message: error, kind: .warning)
                                .padding(.horizontal, 24)
                        }
                        
                        Spacer()
                        
                        AvatarLayer(hour: selectedHour, tempC: selectedTimeWeather.temp, feelScore: currentFeelScore)
                            .scaleEffect(1.2) // 아바타를 더 큼지막하게 표시
                        
                        Spacer()
                        
                        if let prediction = predictionResult {
                            FeelGaugeView(feelScore: currentFeelScore, confidence: prediction.confidence, label: nil)
                                .padding(.horizontal, 32)
                                .padding(.bottom, 32)
                        }
                    }
                    .frame(minHeight: 480) // Hero 영역 최소 높이

                    // 하단 기능 카드 영역
                    VStack(spacing: 16) {
                        bottomContent
                    }
                    .padding(.horizontal, 24)
                    .padding(.bottom, 40)
                }
            }
            .scrollIndicators(.hidden)
        }
        .ignoresSafeArea()
    }

    private var skyBackgroundLayer: some View {
        let timePhase = SkyTimePhase.from(hour: selectedHour)
        let skyImageName = "sky_\(timePhase.rawValue)_clear"
        if let skyImage = UIImage(named: skyImageName) {
            return AnyView(
                Image(uiImage: skyImage)
                    .resizable()
                    .aspectRatio(contentMode: .fill)
                    .ignoresSafeArea()
                    .overlay(weatherTintOverlay)
            )
        } else {
            return AnyView(SkyGradientView(hour: selectedHour, weatherCode: selectedTimeWeather.code, tempC: selectedTimeWeather.temp))
        }
    }

    private var weatherTintOverlay: some View {
        Group {
            switch selectedTimeWeather.code {
            case 200...299: Color.black.opacity(0.4)
            case 300...599: Color.gray.opacity(0.3)
            case 600...699: Color.white.opacity(0.2)
            case 700...799: Color.gray.opacity(0.2)
            case 803...899: Color.gray.opacity(0.15)
            default: Color.clear
            }
        }
        .animation(.easeInOut(duration: 1.5), value: selectedTimeWeather.code)
    }

    private var compactWeatherHeader: some View {
        VStack(spacing: 8) {
            Text(locationLabel + " · " + timeLabel)
                .font(.system(size: 15, weight: .semibold))
                .foregroundStyle(.white.opacity(0.9))
            
            HStack(alignment: .lastTextBaseline, spacing: 12) {
                Text("\(Int(selectedTimeWeather.temp.rounded()))°")
                    .font(.system(size: 64, weight: .bold))
                    .foregroundStyle(.white)
                Text(weatherDescription)
                    .font(.system(size: 28, weight: .semibold))
                    .foregroundStyle(.white.opacity(0.95))
            }
            
            HStack(spacing: 16) {
                Label("습도 \(selectedTimeWeather.humidity)%", systemImage: "drop.fill")
                Label(String(format: "바람 %.1fm/s", selectedTimeWeather.wind), systemImage: "wind")
            }
            .font(.system(size: 14, weight: .medium))
            .foregroundStyle(.white.opacity(0.85))
        }
    }

    private var locationLabel: String { "서울특별시" }
    private static let dateFormatter: DateFormatter = {
        let f = DateFormatter()
        f.dateFormat = "M월 d일 EEEE"
        f.locale = Locale(identifier: "ko_KR")
        return f
    }()
    private var timeLabel: String { Self.dateFormatter.string(from: Date()) }
    private var weatherDescription: String {
        if let desc = weatherState.data?.current.weatherDescription, desc != "-" { return desc }
        return emojiForCode(selectedTimeWeather.code)
    }
    private func emojiForCode(_ code: Int) -> String {
        if code >= 200 && code < 300 { return "뇌우" }
        if code >= 300 && code < 400 { return "이슬비" }
        if code >= 500 && code < 600 { return "비" }
        if code >= 600 && code < 700 { return "눈" }
        if code >= 700 && code < 800 { return "안개" }
        if code == 800 { return "맑음" }
        if code == 801 { return "약간 흐림" }
        if code == 802 { return "부분 흐림" }
        if code >= 803 { return "흐림" }
        return "맑음"
    }
}
