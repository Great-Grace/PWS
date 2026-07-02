import SwiftUI

// MARK: - Time Scrollbar
// 06:00~22:00 범위의 시간 스크롤바
// hourly forecast와 연동, 날씨 씬 상태 제어

struct TimeScrollbar: View {
    @Binding var selectedHour: Double
    let hourlyForecasts: [HourlyForecastSnapshot]
    var range: ClosedRange<Double> = 6...22

    @State private var isDragging = false
    @GestureState private var dragOffset: CGFloat?

    var body: some View {
        VStack(spacing: PWSTokens.spacing8) {
            // 시간 라벨
            timeLabel

            // 스크롤바
            GeometryReader { geometry in
                let width = geometry.size.width
                let height: CGFloat = 56

                ZStack(alignment: .leading) {
                    // 배경 트랙
                    trackBackground(width: width, height: height)

                    // 시간 마커
                    timeMarkers(width: width, height: height)

                    // 날씨 아이콘 마커
                    weatherIcons(width: width, height: height)

                    // 슬라이더 thumb
                    thumb(width: width, height: height)
                }
                .frame(height: height)
                .gesture(
                    DragGesture(minimumDistance: 0)
                        .onChanged { value in
                            isDragging = true
                            let progress = value.location.x / width
                            let hour = range.lowerBound + progress * (range.upperBound - range.lowerBound)
                            selectedHour = max(range.lowerBound, min(range.upperBound, hour))
                        }
                        .onEnded { _ in
                            isDragging = false
                            // 가장 가까운 정수 시간으로 스냅
                            withAnimation(.snappy(duration: 0.15)) {
                                selectedHour = round(selectedHour)
                            }
                            // 스냅 시 햅틱 피드백
                            UISelectionFeedbackGenerator().selectionChanged()
                        }
                )
            }
            .frame(height: 56)

            // 시간 눈금
            hourTicks
        }
        .padding(.horizontal, PWSTokens.spacing24)
        .padding(.vertical, PWSTokens.spacing12)
        .accessibilityElement(children: .contain)
        .accessibilityLabel("시간 선택 스크롤바")
        .accessibilityValue(formatHour(selectedHour))
    }

    // MARK: - Time label

    private var timeLabel: some View {
        HStack {
            Text(formatHour(selectedHour))
                .font(.system(size: 15, weight: .semibold))
                .foregroundStyle(.white.opacity(0.9))
            Spacer()
            Text(currentForecast?.weatherDesc ?? "")
                .font(.system(size: 13))
                .foregroundStyle(.white.opacity(0.7))
            if let temp = currentForecast?.temp {
                Text("\(Int(temp.rounded()))°")
                    .font(.system(size: 15, weight: .bold))
                    .foregroundStyle(.white)
            }
        }
    }

    // MARK: - Track

    private func trackBackground(width: CGFloat, height: CGFloat) -> some View {
        RoundedRectangle(cornerRadius: height / 2)
            .fill(.white.opacity(0.15))
            .frame(height: height)
    }

    // MARK: - Time markers

    private func timeMarkers(width: CGFloat, height: CGFloat) -> some View {
        let hours = stride(from: range.lowerBound, through: range.upperBound, by: 3)
        return ForEach(Array(hours), id: \.self) { hour in
            let x = hourToX(hour, width: width)
            Rectangle()
                .fill(.white.opacity(0.25))
                .frame(width: 1, height: height * 0.3)
                .position(x: x, y: height / 2)
        }
    }

    // MARK: - Weather icons along track

    private func weatherIcons(width: CGFloat, height: CGFloat) -> some View {
        ForEach(Array(hourlyForecasts.enumerated()), id: \.offset) { _, forecast in
            let x = hourToX(forecast.hour, width: width)
            Image(systemName: symbolForCode(forecast.weatherCode))
                .font(.system(size: 10, weight: .semibold))
                .foregroundStyle(.white)
                .position(x: x, y: height * 0.25)
        }
    }

    // MARK: - Thumb

    private func thumb(width: CGFloat, height: CGFloat) -> some View {
        let x = hourToX(selectedHour, width: width)
        return ZStack {
            Circle()
                .fill(.white)
                .frame(width: isDragging ? 28 : 22, height: isDragging ? 28 : 22)
                .shadow(color: .black.opacity(0.2), radius: 4, x: 0, y: 2)

            Circle()
                .fill(PWSTokens.actionBlue)
                .frame(width: isDragging ? 20 : 14, height: isDragging ? 20 : 14)
        }
        .position(x: x, y: height / 2)
        .animation(.snappy(duration: 0.12), value: isDragging)
    }

    // MARK: - Hour ticks

    private var hourTicks: some View {
        HStack {
            ForEach(Array(stride(from: range.lowerBound, through: range.upperBound, by: 3)), id: \.self) { hour in
                Text(formatHourShort(hour))
                    .font(.system(size: 10, weight: .medium))
                    .foregroundStyle(.white.opacity(0.6))
                    .frame(maxWidth: .infinity)
            }
        }
    }

    // MARK: - Helpers

    private func hourToX(_ hour: Double, width: CGFloat) -> CGFloat {
        let progress = (hour - range.lowerBound) / (range.upperBound - range.lowerBound)
        return CGFloat(progress) * width
    }

    private func formatHour(_ hour: Double) -> String {
        let h = Int(hour)
        let m = Int((hour - Double(h)) * 60)
        if h == 0 { return "자정 00:00" }
        if h == 12 { return "정오 12:00" }
        return String(format: "%02d:%02d", h, m)
    }

    private func formatHourShort(_ hour: Double) -> String {
        let h = Int(hour)
        if h == 0 { return "자정" }
        if h == 12 { return "정오" }
        return "\(h)시"
    }

    private func symbolForCode(_ code: Int) -> String {
        switch code {
        case 200..<300: return "cloud.bolt.rain.fill"
        case 300..<400: return "cloud.drizzle.fill"
        case 500..<600: return "cloud.rain.fill"
        case 600..<700: return "cloud.snow.fill"
        case 700..<800: return "cloud.fog.fill"
        case 800:       return "sun.max.fill"
        case 801:       return "cloud.sun.fill"
        case 802:       return "cloud.fill"
        case 803...899: return "smoke.fill"
        default:        return "thermometer"
        }
    }

    private var currentForecast: HourlyForecastSnapshot? {
        hourlyForecasts.first { abs($0.hour - selectedHour) < 1.5 }
    }
}

// MARK: - Hourly Forecast Snapshot (UI용 경량 모델)

struct HourlyForecastSnapshot: Equatable {
    let hour: Double       // 0~24
    let temp: Double
    let humidity: Int
    let windSpeed: Double
    let weatherCode: Int
    let weatherDesc: String
    let precipitation: Double

    /// WeatherDataNative.hourly에서 변환
    static func from(nativeHourly: [HourlyForecastNative]) -> [HourlyForecastSnapshot] {
        nativeHourly.map { entry in
            let date = Date(timeIntervalSince1970: TimeInterval(entry.dt))
            let calendar = Calendar.current
            let hour = Double(calendar.component(.hour, from: date))
                + Double(calendar.component(.minute, from: date)) / 60
            return HourlyForecastSnapshot(
                hour: hour,
                temp: entry.temp,
                humidity: entry.humidity,
                windSpeed: entry.windSpeed,
                weatherCode: entry.weatherCode,
                weatherDesc: entry.weatherDescription,
                precipitation: entry.precipitation1h ?? 0
            )
        }
    }
}


