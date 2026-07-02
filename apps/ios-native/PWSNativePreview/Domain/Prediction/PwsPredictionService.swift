import Foundation

// MARK: - Prediction Result

struct PredictionResult: Equatable {
    let overall: Double                    // 전체 체감 (연속값 1~7)
    let bySlot: [FeedbackSlotType: Double] // 슬롯별 체감
    let confidence: PredictionConfidence
    let envBase: Double                    // UTCI 기반 환경 점수
    let features: [Float]                  // 피처 벡터 (디버깅용)
    let weights: [Float]                   // 현재 가중치 (디버깅용)
}

// MARK: - Prediction Service

final class PwsPredictionService {

    private let weightsStore: PredictionWeightsStore

    init(weightsStore: PredictionWeightsStore = InMemoryPredictionWeightsStore()) {
        self.weightsStore = weightsStore
    }

    // MARK: - Predict

    func predict(
        weather: CurrentWeatherNative?,
        hourlyForecasts: [HourlyForecastNative],
        feedbackState: FeedbackRepositoryState,
        userWeights: [Float]?,
        userBMIOffset: Double = 0,
        koreaBaseline: Double = 0.3,
        now: Date = Date()
    ) -> PredictionResult {
        guard let weather else {
            return emptyPrediction
        }

        let calendar = Calendar.current
        let hour = Double(calendar.component(.hour, from: now))
        let dayOfYear = PwsFormulaEngine.getDayOfYear(now)

        // 1. Env base (UTCI 기반)
        let envBase = PwsFormulaEngine.computeEnvBase(
            temp: weather.temp,
            humidity: Double(weather.humidity),
            windMps: weather.windSpeed,
            tmrtCorrected: weather.tmrtApi,
            precipMmh: weather.precipitation1h ?? 0
        )

        // 2. Feature vector
        let features = PwsFormulaEngine.computeWeatherFeatures(
            tempC: weather.temp,
            humidity: Double(weather.humidity),
            windMps: weather.windSpeed,
            tmrt: weather.tmrtApi ?? weather.temp,
            precipMmh: weather.precipitation1h ?? 0,
            hour: hour,
            dayOfYear: dayOfYear
        )
        let featureArray = features.toArray()

        // 3. Resolve weights
        let weights = PwsFormulaEngine.resolveWeights(userWeights ?? weightsStore.loadWeights())

        // 4. Perceptron prediction
        let perceptronFeel = PwsFormulaEngine.computePerceptronFeel(
            weights: weights,
            features: featureArray
        )

        // 5. Confidence from feedback count
        let totalFeedbackCount = feedbackState.feedbackCount
        let confidence = PwsFormulaEngine.getConfidenceFromCount(totalFeedbackCount)

        // 6. Overall: blend env_base + perceptron based on confidence
        let overall: Double
        switch confidence {
        case .cold_start:
            overall = envBase  // 데이터 없으면 UTCI만
        case .low:
            overall = envBase * 0.6 + perceptronFeel * 0.4
        case .medium:
            overall = envBase * 0.3 + perceptronFeel * 0.7
        case .high:
            overall = perceptronFeel  // 데이터 충분하면 퍼셉트론만
        }

        // 7. Slot-specific predictions
        let slotPredictions = predictBySlot(
            weather: weather,
            hourlyForecasts: hourlyForecasts,
            weights: weights,
            now: now
        )

        return PredictionResult(
            overall: PwsFormulaEngine.clampFeel(overall),
            bySlot: slotPredictions,
            confidence: confidence,
            envBase: envBase,
            features: featureArray,
            weights: weights
        )
    }

    // MARK: - Slot-specific prediction

    private func predictBySlot(
        weather: CurrentWeatherNative,
        hourlyForecasts: [HourlyForecastNative],
        weights: [Float],
        now: Date
    ) -> [FeedbackSlotType: Double] {
        let calendar = Calendar.current
        let dayOfYear = PwsFormulaEngine.getDayOfYear(now)
        var result: [FeedbackSlotType: Double] = [:]

        // 각 슬롯의 대표 시간
        let slotHours: [(FeedbackSlotType, Double)] = [
            (.morning, 8),
            (.afternoon, 14),
            (.evening, 20),
        ]

        for (slot, representativeHour) in slotHours {
            // 해당 시간대 hourly에서 가장 가까운 예보
            let targetTimestamp = calendar.startOfDay(for: now).timeIntervalSince1970
                + representativeHour * 3600

            let closestForecast = hourlyForecasts.min(by: {
                abs(Double($0.dt) - targetTimestamp) < abs(Double($1.dt) - targetTimestamp)
            })

            let temp = closestForecast?.temp ?? weather.temp
            let humidity = Double(closestForecast?.humidity ?? weather.humidity)
            let wind = closestForecast?.windSpeed ?? weather.windSpeed
            let precip = closestForecast?.precipitation1h ?? weather.precipitation1h ?? 0

            let envBase = PwsFormulaEngine.computeEnvBase(
                temp: temp,
                humidity: humidity,
                windMps: wind,
                tmrtCorrected: temp,
                precipMmh: precip
            )

            let features = PwsFormulaEngine.computeWeatherFeatures(
                tempC: temp,
                humidity: humidity,
                windMps: wind,
                tmrt: temp,
                precipMmh: precip,
                hour: representativeHour,
                dayOfYear: dayOfYear
            )

            let perceptronFeel = PwsFormulaEngine.computePerceptronFeel(
                weights: weights,
                features: features.toArray()
            )

            // cold_start이면 env_base만, 아니면 blend
            result[slot] = PwsFormulaEngine.clampFeel(
                envBase * 0.3 + perceptronFeel * 0.7
            )
        }

        return result
    }

    // MARK: - Learn from feedback

    func learn(
        from entry: FeedbackEntryNative,
        weather: CurrentWeatherNative?,
        currentWeights: [Float]?,
        koreaBaseline: Double = 0.3
    ) -> [Float] {
        guard let weather else {
            return PwsFormulaEngine.resolveWeights(currentWeights)
        }

        var weights = PwsFormulaEngine.resolveWeights(currentWeights)

        let features = PwsFormulaEngine.computeWeatherFeatures(
            tempC: entry.actualTemp ?? weather.temp,
            humidity: Double(entry.actualHumidity ?? weather.humidity),
            windMps: entry.actualWind ?? weather.windSpeed,
            tmrt: entry.actualTemp ?? weather.temp,
            precipMmh: entry.actualPrecip ?? 0,
            hour: slotHour(entry.feedbackSlot),
            dayOfYear: PwsFormulaEngine.getDayOfYear(Date())
        )

        PwsFormulaEngine.updateWeights(
            weights: &weights,
            features: features.toArray(),
            actualFeel: Double(entry.feelScore)
        )

        weightsStore.saveWeights(weights)
        return weights
    }

    // MARK: - Helpers

    private var emptyPrediction: PredictionResult {
        PredictionResult(
            overall: 4.0,
            bySlot: [:],
            confidence: .cold_start,
            envBase: 4.0,
            features: [Float](repeating: 0, count: PwsFormulaEngine.featureDim),
            weights: PwsFormulaEngine.initWeights()
        )
    }

    private func slotHour(_ slot: FeedbackSlot) -> Double {
        switch slot {
        case .morning:   return 8
        case .afternoon: return 14
        case .evening:   return 20
        }
    }
}

// MARK: - Weights Store Protocol

protocol PredictionWeightsStore {
    func loadWeights() -> [Float]?
    func saveWeights(_ weights: [Float])
}

// MARK: - In-Memory Weights Store (for testing / preview)

struct InMemoryPredictionWeightsStore: PredictionWeightsStore {
    private var stored: [Float]?

    func loadWeights() -> [Float]? { stored }

    mutating func saveWeights(_ weights: [Float]) {
        stored = weights
    }
}
