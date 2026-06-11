import XCTest
@testable import PWSNativePreview

final class FeedbackContractTests: XCTestCase {
    func testFeedbackInputFallsBackAndClampsToSharedRanges() {
        let input = FeedbackInputNative(
            feelScore: 9,
            humidFeel: 0,
            windFeel: 7,
            clothing: -1,
            activity: 5,
            slot: nil
        )

        let normalized = FeedbackContract().normalizedInput(input)

        XCTAssertEqual(normalized.feelScore, 7)
        XCTAssertEqual(normalized.humidFeel, 1)
        XCTAssertEqual(normalized.windFeel, 3)
        XCTAssertEqual(normalized.clothing, 1)
        XCTAssertEqual(normalized.activity, 3)
        XCTAssertEqual(normalized.slot, .afternoon)
    }

    func testHistoryFiltersInclusiveRangeAndSkipsLocalTesterSessions() {
        let contract = FeedbackContract()
        let entries = [
            entry(id: "1", userId: "user-1", date: "2026-05-04", slot: .evening),
            entry(id: "2", userId: "user-1", date: "2026-05-05", slot: .morning),
            entry(id: "3", userId: "user-1", date: "2026-05-05", slot: .afternoon),
            entry(id: "4", userId: "user-2", date: "2026-05-05", slot: .morning)
        ]

        let history = contract.history(
            entries: entries,
            userId: "user-1",
            startDate: "2026-05-04",
            endDate: "2026-05-05"
        )

        XCTAssertEqual(history.map(\.id), ["2", "3", "1"])
        XCTAssertEqual(contract.history(entries: entries, userId: "dev-pws_dev", startDate: "2026-05-04", endDate: "2026-05-05"), [])
        XCTAssertEqual(contract.history(entries: entries, userId: nil, startDate: "2026-05-04", endDate: "2026-05-05"), [])
    }

    func testSlotCountsAndHistorySummaryMatchSharedDisplayRules() {
        let entries = [
            entry(id: "1", userId: "user-1", date: "2026-05-04", slot: .morning),
            entry(id: "2", userId: "user-1", date: "2026-05-05", slot: .evening),
            entry(id: "3", userId: "user-1", date: "2026-05-06", slot: .evening)
        ]
        let counts = FeedbackContract().slotCounts(entries: entries, userId: "user-1")
        let summary = HistorySummaryFactory().summary(from: FeedbackRepositoryState(
            feedbackCount: 3,
            feedbackCountBySlot: counts
        ))

        XCTAssertEqual(counts[.morning], 1)
        XCTAssertEqual(counts[.afternoon], 0)
        XCTAssertEqual(counts[.evening], 2)
        XCTAssertEqual(summary.metrics.map(\.value), ["3개", "1개", "0개", "2개"])
        XCTAssertTrue(summary.trendMessage.contains("저녁 시간대 기록이 가장 많아요"))
    }

    func testInMemoryRepositoryPersistsSelectedFeedbackInput() {
        var repository = InMemoryFeedbackRepository()
        let now = Date(timeIntervalSince1970: 1_778_006_400)

        let entry = repository.submitFeedback(
            userId: "dev-pws_dev",
            input: FeedbackInputNative(
                feelScore: 6,
                humidFeel: 4,
                windFeel: 3,
                clothing: 3,
                clothingItems: ["긴팔티", "코트", "슬랙스"],
                activity: 2,
                slot: .evening
            ),
            now: now
        )

        XCTAssertEqual(entry.feedbackSlot, .evening)
        XCTAssertEqual(entry.feelScore, 6)
        XCTAssertEqual(entry.humidFeel, 4)
        XCTAssertEqual(entry.windFeel, 3)
        XCTAssertEqual(entry.clothing, 3)
        XCTAssertEqual(entry.clothingItems, ["긴팔티", "코트", "슬랙스"])
        XCTAssertEqual(repository.state.feedbackCount, 1)
        XCTAssertEqual(repository.state.feedbackCountBySlot[.evening], 1)
        XCTAssertEqual(repository.state.recentEntries.first?.id, entry.id)
    }

    func testSupportFeedbackBodySkipsLocalTesterAndTrimsMessages() throws {
        let contract = FeedbackContract()

        XCTAssertThrowsError(try contract.supportFeedbackBody(userId: "dev-pws_dev", message: "hello")) { error in
            XCTAssertEqual(error as? FeedbackContractError, .remoteWriteSkipped)
        }
        XCTAssertThrowsError(try contract.supportFeedbackBody(userId: "user-1", message: "   ")) { error in
            XCTAssertEqual(error as? FeedbackContractError, .remoteWriteSkipped)
        }

        let body = try XCTUnwrap(JSONSerialization.jsonObject(
            with: contract.supportFeedbackBody(userId: "user-1", message: "  \(String(repeating: "a", count: 501))  ")
        ) as? [String: String])

        XCTAssertEqual(body["user_id"], "user-1")
        XCTAssertEqual(body["message"]?.count, 500)
    }

    func testPwsDateUsesFiveAmBoundary() throws {
        let timeZone = try XCTUnwrap(TimeZone(identifier: "Asia/Seoul"))
        let formatter = ISO8601DateFormatter()
        XCTAssertEqual(
            FeedbackContract().pwsDateString(from: try XCTUnwrap(formatter.date(from: "2026-05-17T04:59:00+09:00")), timeZone: timeZone),
            "2026-05-16"
        )
        XCTAssertEqual(
            FeedbackContract().pwsDateString(from: try XCTUnwrap(formatter.date(from: "2026-05-17T05:00:00+09:00")), timeZone: timeZone),
            "2026-05-17"
        )
    }

    func testRemoteFeedbackRepositorySubmitsAndRefreshesRemoteState() async throws {
        let transport = RecordingFeedbackTransport(responses: [
            NativeHTTPResponse(statusCode: 201, data: Data("""
            [{
              "id": "entry-1",
              "user_id": "user-1",
              "feedback_date": "2026-05-17",
              "feedback_slot": "afternoon",
              "feel_score": 4,
              "humid_feel": 3,
              "wind_feel": 1,
              "clothing": 2,
              "clothing_items": ["반팔티", "청바지"],
              "activity": 2,
              "sun_exposure": null,
              "sleep": null,
              "outdoor_hours": null,
              "actual_temp": 21.4,
              "actual_humidity": 45,
              "actual_wind": 2.1,
              "actual_precip": 0
            }]
            """.utf8)),
            NativeHTTPResponse(statusCode: 200, data: Data("""
            [{
              "id": "entry-1",
              "user_id": "user-1",
              "feedback_date": "2026-05-17",
              "feedback_slot": "afternoon",
              "feel_score": 4,
              "humid_feel": 3,
              "wind_feel": 1,
              "clothing": 2,
              "clothing_items": ["반팔티", "청바지"],
              "activity": 2,
              "sun_exposure": null,
              "sleep": null,
              "outdoor_hours": null,
              "actual_temp": 21.4,
              "actual_humidity": 45,
              "actual_wind": 2.1,
              "actual_precip": 0
            }]
            """.utf8)),
            NativeHTTPResponse(statusCode: 200, data: Data(#"[{"feedback_slot":"afternoon"}]"#.utf8))
        ])
        let repository = try remoteRepository(transport: transport)

        let state = try await repository.submitFeedback(
            userId: "user-1",
            input: FeedbackInputNative(
                feelScore: 4,
                humidFeel: 3,
                windFeel: 1,
                clothing: 2,
                clothingItems: ["반팔티", "청바지"],
                activity: 2,
                slot: .afternoon
            ),
            currentWeather: CurrentWeatherNative(
                temp: 21.4,
                feelsLike: 20.8,
                humidity: 45,
                windSpeed: 2.1,
                weatherCode: 800,
                weatherDescription: "맑음",
                uvIndex: 7.5,
                precipitation1h: 0,
                tmrtApi: nil
            ),
            now: fixedDate()
        )

        XCTAssertEqual(transport.requests.count, 3)
        XCTAssertEqual(transport.requests[0].httpMethod, "POST")
        XCTAssertEqual(transport.requests[0].url?.host, "project.supabase.co")
        XCTAssertEqual(transport.requests[0].url?.path, "/rest/v1/feedback_entries")
        XCTAssertTrue(try XCTUnwrap(transport.requests[0].url?.absoluteString).contains("on_conflict=user_id,feedback_date,feedback_slot"))
        XCTAssertEqual(transport.requests[0].value(forHTTPHeaderField: "Prefer"), "resolution=merge-duplicates,return=representation")
        let body = try XCTUnwrap(JSONSerialization.jsonObject(with: transport.requests[0].httpBody ?? Data()) as? [String: Any])
        XCTAssertEqual(body["user_id"] as? String, "user-1")
        XCTAssertEqual(body["feedback_date"] as? String, "2026-05-17")
        XCTAssertEqual(body["feedback_slot"] as? String, "afternoon")
        XCTAssertEqual(body["actual_temp"] as? Double, 21.4)
        XCTAssertEqual(state.todayFeedback.map(\.id), ["entry-1"])
        XCTAssertEqual(state.feedbackCount, 1)
        XCTAssertEqual(state.feedbackCountBySlot[.afternoon], 1)
    }

    func testRemoteFeedbackRepositoryFetchesInclusiveHistoryRange() async throws {
        let transport = RecordingFeedbackTransport(responses: [
            NativeHTTPResponse(statusCode: 200, data: Data("""
            [{
              "id": "entry-2",
              "user_id": "user-1",
              "feedback_date": "2026-05-16",
              "feedback_slot": "morning",
              "feel_score": 3,
              "humid_feel": 3,
              "wind_feel": 1,
              "clothing": 2,
              "clothing_items": null,
              "activity": 2,
              "sun_exposure": null,
              "sleep": null,
              "outdoor_hours": null
            }]
            """.utf8)),
            NativeHTTPResponse(statusCode: 200, data: Data(#"[{"feedback_slot":"morning"},{"feedback_slot":"evening"}]"#.utf8))
        ])
        let repository = try remoteRepository(transport: transport)

        let state = try await repository.fetchHistory(userId: "user-1", startDate: "2026-05-10", endDate: "2026-05-17")

        XCTAssertEqual(transport.requests.count, 2)
        let historyURL = try XCTUnwrap(transport.requests.first?.url?.absoluteString)
        XCTAssertTrue(historyURL.contains("feedback_date=gte.2026-05-10"))
        XCTAssertTrue(historyURL.contains("feedback_date=lte.2026-05-17"))
        XCTAssertTrue(historyURL.contains("order=feedback_date.desc,feedback_slot.asc"))
        XCTAssertEqual(state.recentEntries.map(\.id), ["entry-2"])
        XCTAssertEqual(state.feedbackCount, 2)
        XCTAssertEqual(state.feedbackCountBySlot[.morning], 1)
        XCTAssertEqual(state.feedbackCountBySlot[.evening], 1)
    }

    private func entry(id: String, userId: String, date: String, slot: FeedbackSlot) -> FeedbackEntryNative {
        FeedbackEntryNative(
            id: id,
            userId: userId,
            feedbackDate: date,
            feedbackSlot: slot,
            feelScore: 4,
            humidFeel: 3,
            windFeel: 1,
            clothing: 2,
            clothingItems: nil,
            activity: 2,
            sunExposure: nil,
            sleep: nil,
            outdoorHours: nil
        )
    }

    private func remoteRepository(transport: RecordingFeedbackTransport) throws -> NativeSupabaseFeedbackRepository {
        let sessionStore = NativeSupabaseSessionStore(keyValueStore: InMemoryNativeKeyValueStore())
        try sessionStore.save(NativeSupabaseSession(
            accessToken: "feedback-token",
            refreshToken: "refresh-token",
            expiresAtEpochSeconds: 4_000,
            userId: "user-1"
        ))
        return NativeSupabaseFeedbackRepository(
            config: PWSConfig(supabaseURL: "https://project.supabase.co/", supabaseAnonKey: "anon-key", testerPassword: "secret"),
            sessionStore: sessionStore,
            transport: transport,
            nowEpochSeconds: { 1_000 }
        )
    }

    private func fixedDate() -> Date {
        ISO8601DateFormatter().date(from: "2026-05-17T12:00:00+09:00")!
    }
}

private final class RecordingFeedbackTransport: NativeHTTPTransport {
    private var responses: [NativeHTTPResponse]
    private(set) var requests: [URLRequest] = []

    init(responses: [NativeHTTPResponse]) {
        self.responses = responses
    }

    func data(for request: URLRequest) async throws -> NativeHTTPResponse {
        requests.append(request)
        return responses.removeFirst()
    }
}
