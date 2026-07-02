import SwiftUI

// MARK: - Weather Scene View
// SkyGradient + WeatherOverlay + Avatar + TimeScrollbar + Prediction Views
// HomeScreen의 hero 영역을 대체

struct WeatherSceneView: View {
    let weatherState: WeatherRepositoryState
    let feedbackState: FeedbackRepositoryState
    let predictionResult: PredictionResult?
    @Binding var selectedHour: Double

    private var currentTemp: Double {
        weatherState.data?.current.temp ?? 20
    }

    private var currentWeatherCode: Int {
        weatherState.data?.current.weatherCode ?? 800
    }

    private var currentFeelScore: Double {
        predictionResult?.overall ?? weatherState.data?.current.feelsLike ?? currentTemp
    }

    private var hourlyForecasts: [HourlyForecastSnapshot] {
        guard let hourly = weatherState.data?.hourly else { return [] }
        return HourlyForecastSnapshot.from(nativeHourly: hourly)
    }

    /// 선택 시간대의 날씨 데이터 보간
    private var selectedTimeWeather: (temp: Double, code: Int, humidity: Int, wind: Double) {
        if let closest = hourlyForecasts.min(by: { abs($0.hour - selectedHour) < abs($1.hour - selectedHour) }) {
            return (closest.temp, closest.weatherCode, closest.humidity, closest.windSpeed)
        }
        return (currentTemp, currentWeatherCode, 50, 3.0)
    }

    var body: some View {
        ZStack {
            // Layer 0: Sky Gradient
            SkyGradientView(
                hour: selectedHour,
                weatherCode: selectedTimeWeather.code,
                tempC: selectedTimeWeather.temp
            )

            // Layer 1: Weather Overlay (비/눈/안개/구름)
            WeatherOverlayLayer(weatherCode: selectedTimeWeather.code)
                .allowsHitTesting(false)

            // Layer 2: Temperature Atmosphere (추위/더위 효과)
            TemperatureBreathEffect(tempC: selectedTimeWeather.temp)
                .allowsHitTesting(false)

            // Layer 3: Avatar
            VStack {
                Spacer(minLength: 40)
                AvatarLayer(
                    hour: selectedHour,
                    tempC: selectedTimeWeather.temp,
                    feelScore: currentFeelScore
                )
                .padding(.top, 20)
                Spacer()
            }

            // Layer 4: Compact weather info overlay
            VStack {
                compactWeatherHeader
                Spacer()
            }

            // Layer 5: Time Scrollbar (하단)
            VStack {
                Spacer()
                TimeScrollbar(
                    selectedHour: $selectedHour,
                    hourlyForecasts: hourlyForecasts
                )
                .padding(.bottom, 8)
            }
        }
        .frame(height: 420)
        .clipShape(RoundedRectangle(cornerRadius: 0))

        // Prediction views below the scene
        VStack(spacing: PWSTokens.spacing16) {
            // 체감 게이지
            if let prediction = predictionResult {
                FeelGaugeView(
                    feelScore: prediction.overall,
                    confidence: prediction.confidence.rawValue,
                    label: nil
                )
                .padding(.horizontal, PWSTokens.spacing24)
            }

            // 시간대별 예측 스트립
            PredictionStripView(
                morning: predictionResult?.bySlot[.morning].map { slotFeel in
                    PredictionStripView.SlotPrediction(
                        feel: slotFeel,
                        confidence: predictionResult?.confidence.rawValue ?? "cold_start",
                        temp: hourlyForecasts.first(where: { abs($0.hour - 8) < 2 })?.temp,
                        weatherCode: hourlyForecasts.first(where: { abs($0.hour - 8) < 2 })?.weatherCode
                    )
                },
                afternoon: predictionResult?.bySlot[.afternoon].map { slotFeel in
                    PredictionStripView.SlotPrediction(
                        feel: slotFeel,
                        confidence: predictionResult?.confidence.rawValue ?? "cold_start",
                        temp: hourlyForecasts.first(where: { abs($0.hour - 14) < 2 })?.temp,
                        weatherCode: hourlyForecasts.first(where: { abs($0.hour - 14) < 2 })?.weatherCode
                    )
                },
                evening: predictionResult?.bySlot[.evening].map { slotFeel in
                    PredictionStripView.SlotPrediction(
                        feel: slotFeel,
                        confidence: predictionResult?.confidence.rawValue ?? "cold_start",
                        temp: hourlyForecasts.first(where: { abs($0.hour - 20) < 2 })?.temp,
                        weatherCode: hourlyForecasts.first(where: { abs($0.hour - 20) < 2 })?.weatherCode
                    )
                }
            )

            // 체감 변화 곡선 (피드백 데이터가 있을 때만)
            if feedbackState.feedbackCount > 0 {
                FeelTrajectoryChart(
                    dataPoints: buildTrajectoryPoints(),
                    currentHour: Double(Calendar.current.component(.hour, from: Date()))
                )
                .padding(.horizontal, PWSTokens.spacing24)
            }
        }
    }

    // MARK: - Trajectory Points from prediction

    private func buildTrajectoryPoints() -> [FeelTrajectoryChart.TrajectoryPoint] {
        let slots: [(Double, Double?)] = [
            (8, predictionResult?.bySlot[.morning]),
            (14, predictionResult?.bySlot[.afternoon]),
            (20, predictionResult?.bySlot[.evening]),
        ]

        return slots.compactMap { hour, feel in
            guard let feel else { return nil }
            return FeelTrajectoryChart.TrajectoryPoint(
                hour: hour,
                feel: feel,
                confidence: confidenceDouble(predictionResult?.confidence ?? .cold_start),
                weatherCode: hourlyForecasts.min(by: { abs($0.hour - hour) < abs($1.hour - hour) })?.weatherCode
            )
        }
    }

    private func confidenceDouble(_ c: PredictionConfidence) -> Double {
        switch c {
        case .cold_start: return 0.2
        case .low:        return 0.4
        case .medium:     return 0.7
        case .high:       return 1.0
        }
    }

    // MARK: - Compact Weather Header

    private var compactWeatherHeader: some View {
        HStack(alignment: .top) {
            VStack(alignment: .leading, spacing: 4) {
                Text(locationLabel)
                    .font(.system(size: 13, weight: .medium))
                    .foregroundStyle(.white.opacity(0.7))
                Text(timeLabel)
                    .font(.system(size: 12))
                    .foregroundStyle(.white.opacity(0.5))
            }

            Spacer()

            VStack(alignment: .trailing, spacing: 4) {
                HStack(alignment: .lastTextBaseline, spacing: 4) {
                    Text("\(Int(selectedTimeWeather.temp.rounded()))°")
                        .font(.system(size: 42, weight: .bold))
                        .foregroundStyle(.white)
                    Text(weatherDescription)
                        .font(.system(size: 16))
                        .foregroundStyle(.white.opacity(0.8))
                }

                HStack(spacing: 12) {
                    Label("체감 \(Int(currentFeelScore.rounded()))°", systemImage: "thermometer.medium")
                    Label("습도 \(selectedTimeWeather.humidity)%", systemImage: "humidity")
                    Label(String(format: "바람 %.1fm/s", selectedTimeWeather.wind), systemImage: "wind")
                }
                .font(.system(size: 12))
                .foregroundStyle(.white.opacity(0.7))
            }
        }
        .padding(.horizontal, PWSTokens.spacing24)
        .padding(.top, PWSTokens.spacing16)
    }

    // MARK: - Helpers

    private var locationLabel: String {
        "서울특별시"
    }

    private var timeLabel: String {
        let formatter = DateFormatter()
        formatter.dateFormat = "M월 d일 EEEE"
        formatter.locale = Locale(identifier: "ko_KR")
        return formatter.string(from: Date())
    }

    private var weatherDescription: String {
        if let desc = weatherState.data?.current.weatherDesc, desc != "-" {
            return desc
        }
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
