import Foundation

// MARK: - PWS Formula Engine
// TypeScript shared/domain/formulas.ts → Swift 1:1 포팅
// UTCI 다항식 + 11-dim 피처 + 퍼셉트론 + SGD

enum PredictionConfidence: String, Comparable {
    case cold_start
    case low
    case medium
    case high

    static func < (lhs: PredictionConfidence, rhs: PredictionConfidence) -> Bool {
        lhs.sortOrder < rhs.sortOrder
    }

    private var sortOrder: Int {
        switch self {
        case .cold_start: return 0
        case .low:        return 1
        case .medium:     return 2
        case .high:       return 3
        }
    }

    var label: String {
        switch self {
        case .cold_start: return "학습 중"
        case .low:        return "낮음"
        case .medium:     return "보통"
        case .high:       return "높음"
        }
    }
}

enum FeedbackSlotType: String {
    case morning
    case afternoon
    case evening
}

struct PwsFormulaEngine {

    // MARK: - Constants

    static let featureDim = 11
    static let weightDim  = 12  // 11 weights + 1 bias

    static let defaultPriorWeights: [Float] = [
        4.9,    // norm_temp
        0.25,   // humidity_norm
        -0.15,  // wind_norm
        0.45,   // tmrt_norm
        1.15,   // heat_index_bonus
        -1.6,   // wind_chill_penalty
        -0.35,  // precip_norm
        0.0,    // hour_sin
        0.0,    // hour_cos
        0.0,    // season_sin
        0.0,    // season_cos
        0.75,   // bias
    ]

    static let utciOrdinalThresholdsC: [Double] = [-13, 0, 9, 26, 32, 38]
    static let utciOrdinalSoftnessC: Double = 2.5

    // Hardy ITS-90 vapor pressure coefficients
    static let hardyCoefficients: [Double] = [
        -2.8365744e3,
        -6.028076559e3,
        1.954263612e1,
        -2.737830188e-2,
        1.6261698e-5,
        7.0229056e-10,
        -1.8680009e-13,
        2.7150305,
    ]

    // MARK: - Utility

    static func clamp(_ value: Double, _ minValue: Double, _ maxValue: Double) -> Double {
        max(minValue, min(maxValue, value))
    }

    static func clampFeel(_ value: Double) -> Double {
        clamp(value, 1.0, 7.0)
    }

    static func stableSigmoid(_ value: Double) -> Double {
        if value >= 0 {
            let z = exp(-value)
            return 1 / (1 + z)
        }
        let z = exp(value)
        return z / (1 + z)
    }

    // MARK: - Normalization

    /// 기온 → 1~5 정규화
    static func normalizedTemp(_ tempC: Double) -> Double {
        max(1.0, min(5.0, 1.0 + (tempC + 10.0) * (4.0 / 45.0)))
    }

    // MARK: - Vapor Pressure (Hardy ITS-90)

    static func computeSaturationVaporPressureHpa(_ tempC: Double) -> Double {
        let tk = tempC + 273.15
        var value = hardyCoefficients[7] * log(tk)
        for i in 0..<7 {
            value += hardyCoefficients[i] * pow(tk, Double(i) - 2)
        }
        return exp(value) * 0.01
    }

    static func relativeHumidityToVaporPressureHpa(_ tempC: Double, _ relativeHumidity: Double) -> Double {
        computeSaturationVaporPressureHpa(tempC) * clamp(relativeHumidity, 0, 100) / 100
    }

    // MARK: - UTCI Polynomial (Brode et al. 2012)

    private static let utciTerms: [(coeff: Double, taExp: Int, vaExp: Int, dtmrtExp: Int, paExp: Int)] = [
        (6.07562052e-01, 0, 0, 0, 0),
        (-2.27712343e-02, 1, 0, 0, 0),
        (8.06470249e-04, 2, 0, 0, 0),
        (-1.54271372e-04, 3, 0, 0, 0),
        (-3.24651735e-06, 4, 0, 0, 0),
        (7.32602852e-08, 5, 0, 0, 0),
        (1.35959073e-09, 6, 0, 0, 0),
        (-2.25836520e+00, 0, 1, 0, 0),
        (8.80326035e-02, 1, 1, 0, 0),
        (2.16844454e-03, 2, 1, 0, 0),
        (-1.53347087e-05, 3, 1, 0, 0),
        (-5.72983704e-07, 4, 1, 0, 0),
        (-2.55090145e-09, 5, 1, 0, 0),
        (-7.51269505e-01, 0, 2, 0, 0),
        (-4.08350271e-03, 1, 2, 0, 0),
        (-5.21670675e-05, 2, 2, 0, 0),
        (1.94544667e-06, 3, 2, 0, 0),
        (1.14099531e-08, 4, 2, 0, 0),
        (1.58137256e-01, 0, 3, 0, 0),
        (-6.57263143e-05, 1, 3, 0, 0),
        (2.22697524e-07, 2, 3, 0, 0),
        (-4.16117031e-08, 3, 3, 0, 0),
        (-1.27762753e-02, 0, 4, 0, 0),
        (9.66891875e-06, 1, 4, 0, 0),
        (2.52785852e-09, 2, 4, 0, 0),
        (4.56306672e-04, 0, 5, 0, 0),
        (-1.74202546e-07, 1, 5, 0, 0),
        (-5.91491269e-06, 0, 6, 0, 0),
        (3.98374029e-01, 0, 0, 1, 0),
        (1.83945314e-04, 1, 0, 1, 0),
        (-1.73754510e-04, 2, 0, 1, 0),
        (-7.60781159e-07, 3, 0, 1, 0),
        (3.77830287e-08, 4, 0, 1, 0),
        (5.43079673e-10, 5, 0, 1, 0),
        (-2.00518269e-02, 0, 1, 1, 0),
        (8.92859837e-04, 1, 1, 1, 0),
        (3.45433048e-06, 2, 1, 1, 0),
        (-3.77925774e-07, 3, 1, 1, 0),
        (-1.69699377e-09, 4, 1, 1, 0),
        (1.69992415e-04, 0, 2, 1, 0),
        (-4.99204314e-05, 1, 2, 1, 0),
        (2.47417178e-07, 2, 2, 1, 0),
        (1.07596466e-08, 3, 2, 1, 0),
        (8.49242932e-05, 0, 3, 1, 0),
        (1.35191328e-06, 1, 3, 1, 0),
        (-6.21531254e-09, 2, 3, 1, 0),
        (-4.99410301e-06, 0, 4, 1, 0),
        (-1.89489258e-08, 1, 4, 1, 0),
        (8.15300114e-08, 0, 5, 1, 0),
        (7.55043090e-04, 0, 0, 2, 0),
        (-5.65095215e-05, 1, 0, 2, 0),
        (-4.52166564e-07, 2, 0, 2, 0),
        (2.46688878e-08, 3, 0, 2, 0),
        (2.42674348e-10, 4, 0, 2, 0),
        (1.54547250e-04, 0, 1, 2, 0),
        (5.24110970e-06, 1, 1, 2, 0),
        (-8.75874982e-08, 2, 1, 2, 0),
        (-1.50743064e-09, 3, 1, 2, 0),
        (-1.56236307e-05, 0, 2, 2, 0),
        (-1.33895614e-07, 1, 2, 2, 0),
        (2.49709824e-09, 2, 2, 2, 0),
        (6.51711721e-07, 0, 3, 2, 0),
        (1.94960053e-09, 1, 3, 2, 0),
        (-1.00361113e-08, 0, 4, 2, 0),
        (-1.21206673e-05, 0, 0, 3, 0),
        (-2.18203660e-07, 1, 0, 3, 0),
        (7.51269482e-09, 2, 0, 3, 0),
        (9.79063848e-11, 3, 0, 3, 0),
        (1.25006734e-06, 0, 1, 3, 0),
        (-1.81584736e-09, 1, 1, 3, 0),
        (-3.52197671e-10, 2, 1, 3, 0),
        (-3.36514630e-08, 0, 2, 3, 0),
        (1.35908359e-10, 1, 2, 3, 0),
        (4.17032620e-10, 0, 3, 3, 0),
        (-1.30369025e-09, 0, 0, 4, 0),
        (4.13908461e-10, 1, 0, 4, 0),
        (9.22652254e-12, 2, 0, 4, 0),
        (-5.08220384e-09, 0, 1, 4, 0),
        (-2.24730961e-11, 1, 1, 4, 0),
        (1.17139133e-10, 0, 2, 4, 0),
        (6.62154879e-10, 0, 0, 5, 0),
        (4.03863260e-13, 1, 0, 5, 0),
        (1.95087203e-12, 0, 1, 5, 0),
        (-4.73602469e-12, 0, 0, 6, 0),
        (5.12733497e+00, 0, 0, 0, 1),
        (-3.12788561e-01, 1, 0, 0, 1),
        (-1.96701861e-02, 2, 0, 0, 1),
        (9.99690870e-04, 3, 0, 0, 1),
        (9.51738512e-06, 4, 0, 0, 1),
        (-4.66426341e-07, 5, 0, 0, 1),
        (5.48050612e-01, 0, 1, 0, 1),
        (-3.30552823e-03, 1, 1, 0, 1),
        (-1.64119440e-03, 2, 1, 0, 1),
        (-5.16670694e-06, 3, 1, 0, 1),
        (9.52692432e-07, 4, 1, 0, 1),
        (-4.29223622e-02, 0, 2, 0, 1),
        (5.00845667e-03, 1, 2, 0, 1),
        (1.00601257e-06, 2, 2, 0, 1),
        (-1.81748644e-06, 3, 2, 0, 1),
        (-1.25813502e-03, 0, 3, 0, 1),
        (-1.79330391e-04, 1, 3, 0, 1),
        (2.34994441e-06, 2, 3, 0, 1),
        (1.29735808e-04, 0, 4, 0, 1),
        (1.29064870e-06, 1, 4, 0, 1),
        (-2.28558686e-06, 0, 5, 0, 1),
        (-3.69476348e-02, 0, 0, 1, 1),
        (1.62325322e-03, 1, 0, 1, 1),
        (-3.14279680e-05, 2, 0, 1, 1),
        (2.59835559e-06, 3, 0, 1, 1),
        (-4.77136523e-08, 4, 0, 1, 1),
        (8.64203390e-03, 0, 1, 1, 1),
        (-6.87405181e-04, 1, 1, 1, 1),
        (-9.13863872e-06, 2, 1, 1, 1),
        (5.15916806e-07, 3, 1, 1, 1),
        (-3.59217476e-05, 0, 2, 1, 1),
        (3.28696511e-05, 1, 2, 1, 1),
        (-7.10542454e-07, 2, 2, 1, 1),
        (-1.24382300e-05, 0, 3, 1, 1),
        (-7.38584400e-09, 1, 3, 1, 1),
        (2.20609296e-07, 0, 4, 1, 1),
        (-7.32469180e-04, 0, 0, 2, 1),
        (-1.87381964e-05, 1, 0, 2, 1),
        (4.80925239e-06, 2, 0, 2, 1),
        (-8.75492040e-08, 3, 0, 2, 1),
        (2.77862930e-05, 0, 1, 2, 1),
        (-5.06004592e-06, 1, 1, 2, 1),
        (1.14325367e-07, 2, 1, 2, 1),
        (2.53016723e-06, 0, 2, 2, 1),
        (-1.72857035e-08, 1, 2, 2, 1),
        (-3.95079398e-08, 0, 3, 2, 1),
        (-3.59413173e-07, 0, 0, 3, 1),
        (7.04388046e-07, 1, 0, 3, 1),
        (-1.89309167e-08, 2, 0, 3, 1),
        (-4.79768731e-07, 0, 1, 3, 1),
        (7.96079978e-09, 1, 1, 3, 1),
        (1.62897058e-09, 0, 2, 3, 1),
        (3.94367674e-08, 0, 0, 4, 1),
        (-1.18566247e-09, 1, 0, 4, 1),
        (3.34678041e-10, 0, 1, 4, 1),
        (-1.15606447e-10, 0, 0, 5, 1),
        (-2.80626406e+00, 0, 0, 0, 2),
        (5.48712484e-01, 1, 0, 0, 2),
        (-3.99428410e-03, 2, 0, 0, 2),
        (-9.54009191e-04, 3, 0, 0, 2),
        (1.93090978e-05, 4, 0, 0, 2),
        (-3.08806365e-01, 0, 1, 0, 2),
        (1.16952364e-02, 1, 1, 0, 2),
        (4.95271903e-04, 2, 1, 0, 2),
        (-1.90710882e-05, 3, 1, 0, 2),
        (2.10787756e-03, 0, 2, 0, 2),
        (-6.98445738e-04, 1, 2, 0, 2),
        (2.30109073e-05, 2, 2, 0, 2),
        (4.17856590e-04, 0, 3, 0, 2),
        (-1.27043871e-05, 1, 3, 0, 2),
        (-3.04620472e-06, 0, 4, 0, 2),
        (5.14507424e-02, 0, 0, 1, 2),
        (-4.32510997e-03, 1, 0, 1, 2),
        (8.99281156e-05, 2, 0, 1, 2),
        (-7.14663943e-07, 3, 0, 1, 2),
        (-2.66016305e-04, 0, 1, 1, 2),
        (2.63789586e-04, 1, 1, 1, 2),
        (-7.01199003e-06, 2, 1, 1, 2),
        (-1.06823306e-04, 0, 2, 1, 2),
        (3.61341136e-06, 1, 2, 1, 2),
        (2.29748967e-07, 0, 3, 1, 2),
        (3.04788893e-04, 0, 0, 2, 2),
        (-6.42070836e-05, 1, 0, 2, 2),
        (1.16257971e-06, 2, 0, 2, 2),
        (7.68023384e-06, 0, 1, 2, 2),
        (-5.47446896e-07, 1, 1, 2, 2),
        (-3.59937910e-08, 0, 2, 2, 2),
        (-4.36497725e-06, 0, 0, 3, 2),
        (1.68737969e-07, 1, 0, 3, 2),
        (2.67489271e-08, 0, 1, 3, 2),
        (3.23926897e-09, 0, 0, 4, 2),
        (-3.53874123e-02, 0, 0, 0, 3),
        (-2.21201190e-01, 1, 0, 0, 3),
        (1.55126038e-02, 2, 0, 0, 3),
        (-2.63917279e-04, 3, 0, 0, 3),
        (4.53433455e-02, 0, 1, 0, 3),
        (-4.32943862e-03, 1, 1, 0, 3),
        (1.45389826e-04, 2, 1, 0, 3),
        (2.17508610e-04, 0, 2, 0, 3),
        (-6.66724702e-05, 1, 2, 0, 3),
        (3.33217140e-05, 0, 3, 0, 3),
        (-2.26921615e-03, 0, 0, 1, 3),
        (3.80261982e-04, 1, 0, 1, 3),
        (-5.45314314e-09, 2, 0, 1, 3),
        (-7.96355448e-04, 0, 1, 1, 3),
        (2.53458034e-05, 1, 1, 1, 3),
        (-6.31223658e-06, 0, 2, 1, 3),
        (3.02122035e-04, 0, 0, 2, 3),
        (-4.77403547e-06, 1, 0, 2, 3),
        (1.73825715e-06, 0, 1, 2, 3),
        (-4.09087898e-07, 0, 0, 3, 3),
        (6.14155345e-01, 0, 0, 0, 4),
        (-6.16755931e-02, 1, 0, 0, 4),
        (1.33374846e-03, 2, 0, 0, 4),
        (3.55375387e-03, 0, 1, 0, 4),
        (-5.13027851e-04, 1, 1, 0, 4),
        (1.02449757e-04, 0, 2, 0, 4),
        (-1.48526421e-03, 0, 0, 1, 4),
        (-4.11469183e-05, 1, 0, 1, 4),
        (-6.80434415e-06, 0, 1, 1, 4),
        (-9.77675906e-06, 0, 0, 2, 4),
        (8.82773108e-02, 0, 0, 0, 5),
        (-3.01859306e-03, 1, 0, 0, 5),
        (1.04452989e-03, 0, 1, 0, 5),
        (2.47090539e-04, 0, 0, 1, 5),
        (1.48348065e-03, 0, 0, 0, 6),
    ]

    static func computeUtciCelsius(
        airTempC: Double,
        relativeHumidity: Double,
        windMps: Double,
        meanRadiantTempC: Double?
    ) -> Double {
        let ta = clamp(airTempC, -50, 50)
        let tmrt = clamp(meanRadiantTempC ?? ta, ta - 30, ta + 70)
        let va = clamp(windMps, 0.5, 17)
        let vaporPressureHpa = clamp(
            relativeHumidityToVaporPressureHpa(ta, relativeHumidity),
            0, 50
        )
        let dTmrt = tmrt - ta
        let pa = vaporPressureHpa / 10

        let taPowers = precomputePowers(ta)
        let vaPowers = precomputePowers(va)
        let dTmrtPowers = precomputePowers(dTmrt)
        let paPowers = precomputePowers(pa)

        var utci = ta
        for term in utciTerms {
            utci += term.coeff
                * taPowers[term.taExp]
                * vaPowers[term.vaExp]
                * dTmrtPowers[term.dtmrtExp]
                * paPowers[term.paExp]
        }
        return utci
    }

    private static func precomputePowers(_ value: Double) -> [Double] {
        var powers = [Double](repeating: 1.0, count: 7) // 0~6
        for i in 1...6 {
            powers[i] = powers[i - 1] * value
        }
        return powers
    }

    // MARK: - UTCI → Ordinal Feel

    static func computeOrdinalFeelFromUtci(_ utciC: Double, softnessC: Double? = nil) -> Double {
        let softness = max(0.25, softnessC ?? utciOrdinalSoftnessC)
        var previousCumulative = 0.0
        var expected = 0.0

        for i in 0..<utciOrdinalThresholdsC.count {
            let cumulative = stableSigmoid((utciOrdinalThresholdsC[i] - utciC) / softness)
            let probability = clamp(cumulative - previousCumulative, 0, 1)
            expected += Double(i + 1) * probability
            previousCumulative = cumulative
        }
        expected += 7 * clamp(1 - previousCumulative, 0, 1)
        return clampFeel(expected)
    }

    // MARK: - Env Base (Step 1)

    static func computeEnvBase(
        temp: Double,
        humidity: Double,
        windMps: Double,
        tmrtCorrected: Double?,
        precipMmh: Double = 0
    ) -> Double {
        let utci = computeUtciCelsius(
            airTempC: temp,
            relativeHumidity: humidity,
            windMps: windMps,
            meanRadiantTempC: tmrtCorrected ?? temp
        )
        let precipCooling = clamp(precipMmh / 10, 0, 1) * 0.25
        return clampFeel(computeOrdinalFeelFromUtci(utci) - precipCooling)
    }

    // MARK: - 11-dim Feature Vector

    struct WeatherFeatures {
        let normTemp: Double
        let humidityNorm: Double
        let windNorm: Double
        let tmrtNorm: Double
        let heatIndexBonus: Double
        let windChillPenalty: Double
        let precipNorm: Double
        let hourSin: Double
        let hourCos: Double
        let seasonSin: Double
        let seasonCos: Double

        func toArray() -> [Float] {
            [
                Float(normTemp),
                Float(humidityNorm),
                Float(windNorm),
                Float(tmrtNorm),
                Float(heatIndexBonus),
                Float(windChillPenalty),
                Float(precipNorm),
                Float(hourSin),
                Float(hourCos),
                Float(seasonSin),
                Float(seasonCos),
            ]
        }
    }

    static func computeWeatherFeatures(
        tempC: Double,
        humidity: Double,
        windMps: Double,
        tmrt: Double,
        precipMmh: Double = 0,
        hour: Double,
        dayOfYear: Int
    ) -> WeatherFeatures {
        let normTemp = normalizedTemp(tempC) / 5.0
        let humidityNorm = clamp(humidity / 100, 0, 1)
        let windNorm = clamp(windMps / 15, 0, 1)
        let tmrtNorm = clamp((tmrt + 5) / 20, 0, 1)

        let heatIndexBonus = max(0,
            ((tempC - 27) / 8) * ((humidity - 40) / 60)
        )
        let windChillPenalty = max(0,
            ((10 - tempC) / 20) * windNorm
        )
        let precipNorm = clamp(precipMmh / 10, 0, 1)

        let hourRad = 2 * Double.pi * hour / 24
        let hourSin = sin(hourRad)
        let hourCos = cos(hourRad)

        let seasonRad = 2 * Double.pi * Double(dayOfYear) / 365
        let seasonSin = sin(seasonRad)
        let seasonCos = cos(seasonRad)

        return WeatherFeatures(
            normTemp: normTemp,
            humidityNorm: humidityNorm,
            windNorm: windNorm,
            tmrtNorm: tmrtNorm,
            heatIndexBonus: heatIndexBonus,
            windChillPenalty: windChillPenalty,
            precipNorm: precipNorm,
            hourSin: hourSin,
            hourCos: hourCos,
            seasonSin: seasonSin,
            seasonCos: seasonCos
        )
    }

    // MARK: - Perceptron

    static func initWeights() -> [Float] {
        defaultPriorWeights
    }

    static func resolveWeights(_ raw: [Float]?) -> [Float] {
        guard let raw, raw.count == weightDim else { return initWeights() }
        for value in raw {
            if !value.isFinite { return initWeights() }
        }
        // Legacy neutral weights migration
        let allZero = raw.prefix(featureDim).allSatisfy { abs($0) < 1e-6 }
        if allZero && abs(raw[weightDim - 1] - 4.0) <= 1e-6 {
            return initWeights()
        }
        return raw
    }

    static func computePerceptronFeel(weights: [Float], features: [Float]) -> Double {
        var sum = Double(weights[weightDim - 1]) // bias
        for i in 0..<featureDim {
            sum += Double(weights[i]) * Double(features[i])
        }
        return clampFeel(sum)
    }

    static func updateWeights(
        weights: inout [Float],
        features: [Float],
        actualFeel: Double,
        lr: Float = 0.02,
        lambda: Float = 0.001
    ) {
        let predicted = computePerceptronFeel(weights: weights, features: features)
        let target = clamp(actualFeel, 1.0, 7.0)
        let error = Float(predicted - target)

        for i in 0..<featureDim {
            weights[i] -= lr * (error * features[i] + lambda * weights[i])
        }
        // bias: no L2 regularization
        weights[weightDim - 1] -= lr * error
    }

    // MARK: - Confidence

    static func getConfidenceFromCount(_ count: Int) -> PredictionConfidence {
        if count < 7  { return .cold_start }
        if count < 15 { return .low }
        if count < 30 { return .medium }
        return .high
    }

    // MARK: - Slot Utilities

    static func getDefaultSlot(hour: Int) -> FeedbackSlotType {
        if hour >= 6 && hour < 10 { return .morning }
        if hour >= 10 && hour < 18 { return .afternoon }
        return .evening
    }

    static func getDayOfYear(_ date: Date) -> Int {
        Calendar.current.ordinality(of: .day, in: .year, for: date) ?? 1
    }

    // MARK: - Feedback Offsets (Step 2-4)

    struct FeedbackOffsets {
        let clothingOffset: Double
        let activityOffset: Double
        let sleepOffset: Double?
        let adjustedFeel: Double
        let personalFeel: Double
        let exposureWeight: Double
        let weightedFeel: Double
    }

    static func computeFeedbackOffsets(
        feelScore: Double,
        clothing: Double,
        activity: Double,
        sleep: Double? = nil,
        outdoorHours: Double? = nil,
        bmiOffset: Double,
        koreaBaseline: Double
    ) -> FeedbackOffsets {
        let clothingOffset = (clothing - 2) * -0.7
        let activityOffset = (activity - 2) * 0.5
        let sleepOffset = sleep.map { ($0 - 2) * -0.2 }

        let adjustedFeel = feelScore + clothingOffset + activityOffset + (sleepOffset ?? 0)
        let personalFeel = adjustedFeel + bmiOffset + koreaBaseline
        let outdoorHrs = outdoorHours ?? 0
        let exposureWeight = 0.4 + outdoorHrs * 0.2
        let weightedFeel = clampFeel(4 + (personalFeel - 4) * exposureWeight)

        return FeedbackOffsets(
            clothingOffset: clothingOffset,
            activityOffset: activityOffset,
            sleepOffset: sleepOffset,
            adjustedFeel: adjustedFeel,
            personalFeel: personalFeel,
            exposureWeight: exposureWeight,
            weightedFeel: weightedFeel
        )
    }
}
