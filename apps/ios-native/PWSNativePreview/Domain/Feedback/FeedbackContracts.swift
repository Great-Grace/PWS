import Foundation

enum FeedbackSlot: String, CaseIterable, Comparable, Codable {
    case morning
    case afternoon
    case evening

    var label: String {
        switch self {
        case .morning: return "아침"
        case .afternoon: return "낮"
        case .evening: return "저녁"
        }
    }

    static func < (lhs: FeedbackSlot, rhs: FeedbackSlot) -> Bool {
        lhs.ordinal < rhs.ordinal
    }

    private var ordinal: Int {
        switch self {
        case .morning: return 0
        case .afternoon: return 1
        case .evening: return 2
        }
    }
}

struct FeedbackInputNative: Equatable {
    let feelScore: Int
    let humidFeel: Int
    let windFeel: Int
    let clothing: Int
    let clothingItems: [String]
    let activity: Int
    let sunExposure: Int?
    let sleep: Int?
    let outdoorHours: Int?
    let slot: FeedbackSlot?

    init(
        feelScore: Int,
        humidFeel: Int,
        windFeel: Int,
        clothing: Int,
        clothingItems: [String] = [],
        activity: Int,
        sunExposure: Int? = nil,
        sleep: Int? = nil,
        outdoorHours: Int? = nil,
        slot: FeedbackSlot? = nil
    ) {
        self.feelScore = feelScore
        self.humidFeel = humidFeel
        self.windFeel = windFeel
        self.clothing = clothing
        self.clothingItems = clothingItems
        self.activity = activity
        self.sunExposure = sunExposure
        self.sleep = sleep
        self.outdoorHours = outdoorHours
        self.slot = slot
    }
}

struct FeedbackEntryNative: Equatable, Codable {
    let id: String
    let userId: String
    let feedbackDate: String
    let feedbackSlot: FeedbackSlot
    let feelScore: Int
    let humidFeel: Int
    let windFeel: Int
    let clothing: Int
    let clothingItems: [String]?
    let activity: Int
    let sunExposure: Int?
    let sleep: Int?
    let outdoorHours: Int?
    let actualTemp: Double?
    let actualHumidity: Int?
    let actualWind: Double?
    let actualPrecip: Double?

    init(
        id: String,
        userId: String,
        feedbackDate: String,
        feedbackSlot: FeedbackSlot,
        feelScore: Int,
        humidFeel: Int,
        windFeel: Int,
        clothing: Int,
        clothingItems: [String]?,
        activity: Int,
        sunExposure: Int?,
        sleep: Int?,
        outdoorHours: Int?,
        actualTemp: Double? = nil,
        actualHumidity: Int? = nil,
        actualWind: Double? = nil,
        actualPrecip: Double? = nil
    ) {
        self.id = id
        self.userId = userId
        self.feedbackDate = feedbackDate
        self.feedbackSlot = feedbackSlot
        self.feelScore = feelScore
        self.humidFeel = humidFeel
        self.windFeel = windFeel
        self.clothing = clothing
        self.clothingItems = clothingItems
        self.activity = activity
        self.sunExposure = sunExposure
        self.sleep = sleep
        self.outdoorHours = outdoorHours
        self.actualTemp = actualTemp
        self.actualHumidity = actualHumidity
        self.actualWind = actualWind
        self.actualPrecip = actualPrecip
    }

    enum CodingKeys: String, CodingKey {
        case id
        case userId = "user_id"
        case feedbackDate = "feedback_date"
        case feedbackSlot = "feedback_slot"
        case feelScore = "feel_score"
        case humidFeel = "humid_feel"
        case windFeel = "wind_feel"
        case clothing
        case clothingItems = "clothing_items"
        case activity
        case sunExposure = "sun_exposure"
        case sleep
        case outdoorHours = "outdoor_hours"
        case actualTemp = "actual_temp"
        case actualHumidity = "actual_humidity"
        case actualWind = "actual_wind"
        case actualPrecip = "actual_precip"
    }
}

struct FeedbackRepositoryState: Equatable {
    let todayFeedback: [FeedbackEntryNative]
    let recentEntries: [FeedbackEntryNative]
    let feedbackCount: Int
    let feedbackCountBySlot: [FeedbackSlot: Int]
    let isLoading: Bool
    let isSaving: Bool

    init(
        todayFeedback: [FeedbackEntryNative] = [],
        recentEntries: [FeedbackEntryNative] = [],
        feedbackCount: Int = 0,
        feedbackCountBySlot: [FeedbackSlot: Int] = FeedbackSlot.zeroCounts,
        isLoading: Bool = false,
        isSaving: Bool = false
    ) {
        self.todayFeedback = todayFeedback
        self.recentEntries = recentEntries
        self.feedbackCount = feedbackCount
        self.feedbackCountBySlot = feedbackCountBySlot
        self.isLoading = isLoading
        self.isSaving = isSaving
    }
}

struct InMemoryFeedbackRepository: Equatable {
    private var entries: [FeedbackEntryNative]
    private(set) var state: FeedbackRepositoryState

    init(entries: [FeedbackEntryNative] = []) {
        self.entries = entries
        self.state = FeedbackRepositoryState()
    }

    @discardableResult
    mutating func submitFeedback(
        userId: String,
        input: FeedbackInputNative,
        now: Date = Date()
    ) -> FeedbackEntryNative {
        state = FeedbackRepositoryState(
            todayFeedback: state.todayFeedback,
            recentEntries: state.recentEntries,
            feedbackCount: state.feedbackCount,
            feedbackCountBySlot: state.feedbackCountBySlot,
            isLoading: false,
            isSaving: true
        )

        let normalized = FeedbackContract().normalizedInput(input)
        let feedbackDate = FeedbackContract().pwsDateString(from: now)
        let slot = normalized.slot ?? .afternoon
        let entry = FeedbackEntryNative(
            id: "\(userId)-\(feedbackDate)-\(slot.rawValue)-\(entries.count)",
            userId: userId,
            feedbackDate: feedbackDate,
            feedbackSlot: slot,
            feelScore: normalized.feelScore,
            humidFeel: normalized.humidFeel,
            windFeel: normalized.windFeel,
            clothing: normalized.clothing,
            clothingItems: normalized.clothingItems.isEmpty ? nil : normalized.clothingItems,
            activity: normalized.activity,
            sunExposure: normalized.sunExposure,
            sleep: normalized.sleep,
            outdoorHours: normalized.outdoorHours
        )
        entries.append(entry)
        refreshState(userId: userId, now: now)
        return entry
    }

    mutating func refreshState(userId: String, now: Date = Date()) {
        let today = FeedbackContract().pwsDateString(from: now)
        let todayEntries = entries
            .filter { $0.userId == userId && $0.feedbackDate == today }
            .sorted { $0.feedbackSlot < $1.feedbackSlot }
        let userEntries = entries
            .filter { $0.userId == userId }
            .sorted {
                if $0.feedbackDate != $1.feedbackDate {
                    return $0.feedbackDate > $1.feedbackDate
                }
                return $0.feedbackSlot < $1.feedbackSlot
            }
        let counts = FeedbackContract().slotCounts(entries: entries, userId: userId)
        state = FeedbackRepositoryState(
            todayFeedback: todayEntries,
            recentEntries: Array(userEntries.prefix(12)),
            feedbackCount: userEntries.count,
            feedbackCountBySlot: counts,
            isLoading: false,
            isSaving: false
        )
    }

}

struct HistoryMetricNative: Equatable {
    let label: String
    let value: String
}

struct HistorySummaryNative: Equatable {
    let metrics: [HistoryMetricNative]
    let trendMessage: String
}

struct HistorySummaryFactory {
    func summary(from feedbackState: FeedbackRepositoryState) -> HistorySummaryNative {
        let total = feedbackState.feedbackCount
        let morning = feedbackState.feedbackCountBySlot[.morning, default: 0]
        let afternoon = feedbackState.feedbackCountBySlot[.afternoon, default: 0]
        let evening = feedbackState.feedbackCountBySlot[.evening, default: 0]
        let dominantSlot = [
            (FeedbackSlot.morning, morning),
            (FeedbackSlot.afternoon, afternoon),
            (FeedbackSlot.evening, evening)
        ].max { left, right in left.1 < right.1 }?.0 ?? .morning

        return HistorySummaryNative(
            metrics: [
                HistoryMetricNative(label: "누적 기록", value: "\(total)개"),
                HistoryMetricNative(label: "아침", value: "\(morning)개"),
                HistoryMetricNative(label: "낮", value: "\(afternoon)개"),
                HistoryMetricNative(label: "저녁", value: "\(evening)개")
            ],
            trendMessage: total == 0
                ? "아직 기록이 없어요. 첫 체감 기록을 남기면 추세가 표시됩니다."
                : "\(dominantSlot.label) 시간대 기록이 가장 많아요. 총 \(total)개의 체감 기록을 네이티브 저장소에서 불러왔습니다."
        )
    }
}

struct FeedbackContract {
    func pwsDateString(from date: Date, timeZone: TimeZone = .current) -> String {
        var calendar = Calendar(identifier: .gregorian)
        calendar.timeZone = timeZone
        let shifted = calendar.date(byAdding: .hour, value: -5, to: date) ?? date
        let formatter = DateFormatter()
        formatter.calendar = calendar
        formatter.locale = Locale(identifier: "en_US_POSIX")
        formatter.timeZone = timeZone
        formatter.dateFormat = "yyyy-MM-dd"
        return formatter.string(from: shifted)
    }

    func normalizedInput(_ input: FeedbackInputNative) -> FeedbackInputNative {
        FeedbackInputNative(
            feelScore: input.feelScore.clamped(to: 1...7),
            humidFeel: input.humidFeel.clamped(to: 1...5),
            windFeel: input.windFeel.clamped(to: 0...3),
            clothing: input.clothing.clamped(to: 1...3),
            clothingItems: input.clothingItems,
            activity: input.activity.clamped(to: 1...3),
            sunExposure: input.sunExposure,
            sleep: input.sleep,
            outdoorHours: input.outdoorHours,
            slot: input.slot ?? .afternoon
        )
    }

    func history(entries: [FeedbackEntryNative], userId: String?, startDate: String, endDate: String) -> [FeedbackEntryNative] {
        guard let userId, !TesterAuth().isLocalTesterSessionId(userId) else { return [] }
        return entries
            .filter { $0.userId == userId && $0.feedbackDate >= startDate && $0.feedbackDate <= endDate }
            .sorted { left, right in
                if left.feedbackDate != right.feedbackDate {
                    return left.feedbackDate > right.feedbackDate
                }
                return left.feedbackSlot < right.feedbackSlot
            }
    }

    func slotCounts(entries: [FeedbackEntryNative], userId: String) -> [FeedbackSlot: Int] {
        var counts = FeedbackSlot.zeroCounts
        entries.filter { $0.userId == userId }.forEach { entry in
            counts[entry.feedbackSlot, default: 0] += 1
        }
        return counts
    }

    func supportFeedbackBody(userId: String, message: String) throws -> Data {
        let trimmedMessage = String(message.trimmingCharacters(in: .whitespacesAndNewlines).prefix(500))
        guard !TesterAuth().isLocalTesterSessionId(userId), !trimmedMessage.isEmpty else {
            throw FeedbackContractError.remoteWriteSkipped
        }
        let body = ["user_id": userId, "message": trimmedMessage]
        return try JSONSerialization.data(withJSONObject: body, options: [.sortedKeys])
    }
}

enum FeedbackContractError: Error, Equatable {
    case remoteWriteSkipped
}

final class NativeSupabaseFeedbackRepository: @unchecked Sendable {
    private let config: PWSConfig
    private let sessionStore: NativeSupabaseSessionStore
    private let contract: FeedbackContract
    private let transport: NativeHTTPTransport
    private let nowEpochSeconds: () -> Int64
    private let encoder: JSONEncoder
    private let decoder: JSONDecoder

    init(
        config: PWSConfig,
        sessionStore: NativeSupabaseSessionStore,
        contract: FeedbackContract = FeedbackContract(),
        transport: NativeHTTPTransport = URLSessionNativeHTTPTransport(),
        nowEpochSeconds: @escaping () -> Int64 = { Int64(Date().timeIntervalSince1970) }
    ) {
        self.config = config
        self.sessionStore = sessionStore
        self.contract = contract
        self.transport = transport
        self.nowEpochSeconds = nowEpochSeconds
        self.encoder = JSONEncoder()
        self.encoder.outputFormatting = [.sortedKeys]
        self.decoder = JSONDecoder()
    }

    func fetchTodayStatus(userId: String, now: Date = Date()) async throws -> FeedbackRepositoryState {
        let today = contract.pwsDateString(from: now)
        let entries = try await fetchEntries(queryItems: [
            URLQueryItem(name: "user_id", value: "eq.\(userId)"),
            URLQueryItem(name: "feedback_date", value: "eq.\(today)"),
            URLQueryItem(name: "select", value: "*"),
            URLQueryItem(name: "order", value: "feedback_slot.asc")
        ])
        let countState = try await fetchFeedbackCount(userId: userId)
        return FeedbackRepositoryState(
            todayFeedback: entries,
            recentEntries: countState.recentEntries,
            feedbackCount: countState.feedbackCount,
            feedbackCountBySlot: countState.feedbackCountBySlot
        )
    }

    func submitFeedback(
        userId: String,
        input: FeedbackInputNative,
        currentWeather: CurrentWeatherNative?,
        now: Date = Date()
    ) async throws -> FeedbackRepositoryState {
        let body = try encoder.encode(RemoteFeedbackInsertBody(
            userId: userId,
            feedbackDate: contract.pwsDateString(from: now),
            input: contract.normalizedInput(input),
            currentWeather: currentWeather
        ))
        var request = URLRequest(url: try restURL(path: "feedback_entries", queryItems: [
            URLQueryItem(name: "on_conflict", value: "user_id,feedback_date,feedback_slot")
        ]))
        request.httpMethod = "POST"
        request.httpBody = body
        try applyHeaders(to: &request, prefer: "resolution=merge-duplicates,return=representation")
        let response = try await transport.data(for: request)
        guard (200...299).contains(response.statusCode) else {
            throw NativeSupabaseFeedbackRepositoryError.httpStatus(response.statusCode)
        }
        return try await fetchTodayStatus(userId: userId, now: now)
    }

    func fetchHistory(userId: String, startDate: String, endDate: String) async throws -> FeedbackRepositoryState {
        let entries = try await fetchEntries(queryItems: [
            URLQueryItem(name: "user_id", value: "eq.\(userId)"),
            URLQueryItem(name: "feedback_date", value: "gte.\(startDate)"),
            URLQueryItem(name: "feedback_date", value: "lte.\(endDate)"),
            URLQueryItem(name: "select", value: "*"),
            URLQueryItem(name: "order", value: "feedback_date.desc,feedback_slot.asc")
        ])
        let countState = try await fetchFeedbackCount(userId: userId)
        return FeedbackRepositoryState(
            recentEntries: entries,
            feedbackCount: countState.feedbackCount,
            feedbackCountBySlot: countState.feedbackCountBySlot
        )
    }

    func fetchFeedbackCount(userId: String) async throws -> FeedbackRepositoryState {
        var request = URLRequest(url: try restURL(path: "feedback_entries", queryItems: [
            URLQueryItem(name: "user_id", value: "eq.\(userId)"),
            URLQueryItem(name: "select", value: "feedback_slot")
        ]))
        request.httpMethod = "GET"
        try applyHeaders(to: &request)
        let response = try await transport.data(for: request)
        guard (200...299).contains(response.statusCode) else {
            throw NativeSupabaseFeedbackRepositoryError.httpStatus(response.statusCode)
        }
        let slots = try decoder.decode([RemoteFeedbackSlotRow].self, from: response.data)
        var counts = FeedbackSlot.zeroCounts
        slots.forEach { counts[$0.feedbackSlot, default: 0] += 1 }
        return FeedbackRepositoryState(feedbackCount: slots.count, feedbackCountBySlot: counts)
    }

    private func fetchEntries(queryItems: [URLQueryItem]) async throws -> [FeedbackEntryNative] {
        var request = URLRequest(url: try restURL(path: "feedback_entries", queryItems: queryItems))
        request.httpMethod = "GET"
        try applyHeaders(to: &request)
        let response = try await transport.data(for: request)
        guard (200...299).contains(response.statusCode) else {
            throw NativeSupabaseFeedbackRepositoryError.httpStatus(response.statusCode)
        }
        return try decoder.decode([FeedbackEntryNative].self, from: response.data)
    }

    private func applyHeaders(to request: inout URLRequest, prefer: String? = nil) throws {
        guard let accessToken = sessionStore.validAccessToken(nowEpochSeconds: nowEpochSeconds()) else {
            throw NativeSupabaseFeedbackRepositoryError.missingUsableSession
        }
        try ProfileContract().headers(anonKey: config.supabaseAnonKey, accessToken: accessToken, prefer: prefer)
            .forEach { key, value in
                request.setValue(value, forHTTPHeaderField: key)
            }
    }

    private func restURL(path: String, queryItems: [URLQueryItem] = []) throws -> URL {
        let trimmed = config.supabaseURL.trimmingCharacters(in: .whitespacesAndNewlines)
            .trimmingCharacters(in: CharacterSet(charactersIn: "/"))
        guard !trimmed.isEmpty, var components = URLComponents(string: "\(trimmed)/rest/v1/\(path)") else {
            throw NativeSupabaseFeedbackRepositoryError.missingSupabaseURL
        }
        if !queryItems.isEmpty {
            components.queryItems = queryItems
        }
        guard let url = components.url else { throw NativeSupabaseFeedbackRepositoryError.missingSupabaseURL }
        return url
    }
}

enum NativeSupabaseFeedbackRepositoryError: Error, Equatable {
    case missingSupabaseURL
    case missingUsableSession
    case httpStatus(Int)
}

private struct RemoteFeedbackInsertBody: Encodable {
    let userId: String
    let feedbackDate: String
    let feelScore: Int
    let humidFeel: Int
    let windFeel: Int
    let clothing: Int
    let clothingItems: [String]?
    let activity: Int
    let sunExposure: Int?
    let sleep: Int?
    let outdoorHours: Int?
    let feedbackSlot: FeedbackSlot
    let actualTemp: Double?
    let actualHumidity: Int?
    let actualWind: Double?
    let actualPrecip: Double?
    let actualTmrtApi: Double?
    let tmrtCorrected: Double?

    init(userId: String, feedbackDate: String, input: FeedbackInputNative, currentWeather: CurrentWeatherNative?) {
        self.userId = userId
        self.feedbackDate = feedbackDate
        self.feelScore = input.feelScore
        self.humidFeel = input.humidFeel
        self.windFeel = input.windFeel
        self.clothing = input.clothing
        self.clothingItems = input.clothingItems.isEmpty ? nil : input.clothingItems
        self.activity = input.activity
        self.sunExposure = input.sunExposure
        self.sleep = input.sleep
        self.outdoorHours = input.outdoorHours
        self.feedbackSlot = input.slot ?? .afternoon
        self.actualTemp = currentWeather?.temp
        self.actualHumidity = currentWeather?.humidity
        self.actualWind = currentWeather?.windSpeed
        self.actualPrecip = currentWeather?.precipitation1h ?? (currentWeather == nil ? nil : 0)
        self.actualTmrtApi = currentWeather?.tmrtApi
        self.tmrtCorrected = currentWeather?.tmrtApi.map { $0 + Double(input.sunExposure ?? 0) * 8.0 }
    }

    enum CodingKeys: String, CodingKey {
        case userId = "user_id"
        case feedbackDate = "feedback_date"
        case feelScore = "feel_score"
        case humidFeel = "humid_feel"
        case windFeel = "wind_feel"
        case clothing
        case clothingItems = "clothing_items"
        case activity
        case sunExposure = "sun_exposure"
        case sleep
        case outdoorHours = "outdoor_hours"
        case feedbackSlot = "feedback_slot"
        case actualTemp = "actual_temp"
        case actualHumidity = "actual_humidity"
        case actualWind = "actual_wind"
        case actualPrecip = "actual_precip"
        case actualTmrtApi = "actual_tmrt_api"
        case tmrtCorrected = "tmrt_corrected"
    }
}

private struct RemoteFeedbackSlotRow: Decodable {
    let feedbackSlot: FeedbackSlot

    enum CodingKeys: String, CodingKey {
        case feedbackSlot = "feedback_slot"
    }
}

private extension FeedbackSlot {
    static var zeroCounts: [FeedbackSlot: Int] {
        Dictionary(uniqueKeysWithValues: allCases.map { ($0, 0) })
    }
}

private extension Comparable {
    func clamped(to range: ClosedRange<Self>) -> Self {
        min(max(self, range.lowerBound), range.upperBound)
    }
}
