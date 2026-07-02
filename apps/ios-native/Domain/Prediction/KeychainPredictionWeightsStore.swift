import Foundation

// MARK: - Keychain-backed Prediction Weights Store
// 퍼셉트론 가중치를 Keychain에 영구 저장
// 로그인 간 학습 결과 유지

final class KeychainPredictionWeightsStore: PredictionWeightsStore {
    private static let weightsKey = "pws.perceptron.weights"
    private static let updatedAtKey = "pws.perceptron.updated_at"

    private let keyValueStore: NativeKeyValueStore

    init(keyValueStore: NativeKeyValueStore) {
        self.keyValueStore = keyValueStore
    }

    func loadWeights() -> [Float]? {
        guard let jsonString = keyValueStore.string(forKey: Self.weightsKey) else {
            return nil
        }
        guard let data = jsonString.data(using: .utf8) else {
            return nil
        }
        do {
            let decoded = try JSONDecoder().decode([Float].self, from: data)
            guard decoded.count == PwsFormulaEngine.weightDim else {
                return nil
            }
            return decoded
        } catch {
            return nil
        }
    }

    func saveWeights(_ weights: [Float]) {
        guard weights.count == PwsFormulaEngine.weightDim else { return }
        do {
            let data = try JSONEncoder().encode(weights)
            guard let jsonString = String(data: data, encoding: .utf8) else { return }
            try keyValueStore.setString(jsonString, forKey: Self.weightsKey)

            let timestamp = ISO8601DateFormatter().string(from: Date())
            try keyValueStore.setString(timestamp, forKey: Self.updatedAtKey)
        } catch {
            // 저장 실패 시 조용히 무시 (다음 학습에서 재시도)
        }
    }

    func loadUpdatedAt() -> Date? {
        guard let dateString = keyValueStore.string(forKey: Self.updatedAtKey) else {
            return nil
        }
        return ISO8601DateFormatter().date(from: dateString)
    }

    func clear() {
        try? keyValueStore.removeValue(forKey: Self.weightsKey)
        try? keyValueStore.removeValue(forKey: Self.updatedAtKey)
    }
}
