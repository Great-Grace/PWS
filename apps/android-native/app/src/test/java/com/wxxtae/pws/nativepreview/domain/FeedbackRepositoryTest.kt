package com.wxxtae.pws.nativepreview.domain

import java.time.LocalDateTime
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class FeedbackRepositoryTest {
    private val userId = "dev-pws_dev"
    private val morning = LocalDateTime.of(2026, 5, 5, 8, 30)

    @Test
    fun submitFeedbackDefaultsToAfternoonAndStoresTodayStatus() {
        val repository = InMemoryFeedbackRepository()

        val entry = repository.submitFeedback(
            userId = userId,
            input = FeedbackInputNative(
                feelScore = 8,
                humidFeel = 0,
                windFeel = 4,
                clothing = 2,
                activity = 2,
            ),
            now = morning,
        )

        assertEquals(FeedbackSlot.Afternoon, entry.feedbackSlot)
        assertEquals(7, entry.feelScore)
        assertEquals(1, entry.humidFeel)
        assertEquals(3, entry.windFeel)
        assertNull(entry.clothingItems)
        assertEquals(listOf(entry), repository.state.todayFeedback)
        assertFalse(repository.state.isSaving)
    }

    @Test
    fun pwsDateUsesPreviousDateBeforeFiveAm() {
        val repository = InMemoryFeedbackRepository()
        val beforeReset = LocalDateTime.of(2026, 5, 5, 4, 59)

        val entry = repository.submitFeedback(
            userId = userId,
            input = sampleInput(slot = FeedbackSlot.Morning),
            now = beforeReset,
        )

        assertEquals("2026-05-04", entry.feedbackDate)
        assertEquals(listOf(entry), repository.fetchTodayStatus(userId, beforeReset))
        assertEquals(emptyList<FeedbackEntryNative>(), repository.fetchTodayStatus(userId, LocalDateTime.of(2026, 5, 5, 5, 0)))
    }

    @Test
    fun fetchHistoryAndCountAreUserScopedAndSlotAware() {
        val repository = InMemoryFeedbackRepository()
        repository.submitFeedback(userId, sampleInput(slot = FeedbackSlot.Evening), LocalDateTime.of(2026, 5, 3, 18, 0))
        repository.submitFeedback(userId, sampleInput(slot = FeedbackSlot.Morning), LocalDateTime.of(2026, 5, 4, 8, 0))
        repository.submitFeedback("other-user", sampleInput(slot = FeedbackSlot.Morning), LocalDateTime.of(2026, 5, 4, 8, 0))

        val history = repository.fetchHistory(userId, "2026-05-03", "2026-05-04")
        val count = repository.fetchFeedbackCount(userId)

        assertEquals(2, history.size)
        assertEquals(2, count)
        assertEquals(1, repository.state.feedbackCountBySlot[FeedbackSlot.Morning])
        assertEquals(0, repository.state.feedbackCountBySlot[FeedbackSlot.Afternoon])
        assertEquals(1, repository.state.feedbackCountBySlot[FeedbackSlot.Evening])
    }

    @Test
    fun fetchHistorySortsNewestDateFirstThenSlotOrder() {
        val repository = InMemoryFeedbackRepository()
        repository.submitFeedback(userId, sampleInput(slot = FeedbackSlot.Evening), LocalDateTime.of(2026, 5, 3, 18, 0))
        repository.submitFeedback(userId, sampleInput(slot = FeedbackSlot.Evening), LocalDateTime.of(2026, 5, 4, 18, 0))
        repository.submitFeedback(userId, sampleInput(slot = FeedbackSlot.Morning), LocalDateTime.of(2026, 5, 4, 8, 0))

        val history = repository.fetchHistory(userId, "2026-05-03", "2026-05-04")

        assertEquals(
            listOf(
                "2026-05-04:morning",
                "2026-05-04:evening",
                "2026-05-03:evening",
            ),
            history.map { "${it.feedbackDate}:${it.feedbackSlot.name.lowercase()}" },
        )
    }

    @Test
    fun supabaseFeedbackRepositoryUsesAuthenticatedRestContracts() {
        val transport = RecordingProfileTransport(
            responses = ArrayDeque(
                listOf(
                    NativeSupabaseProfileResponse(
                        200,
                        """
                        [{
                          "id":"entry-1",
                          "user_id":"user-1",
                          "feedback_date":"2026-05-05",
                          "feedback_slot":"evening",
                          "feel_score":5,
                          "humid_feel":3,
                          "wind_feel":1,
                          "clothing":2,
                          "clothing_items":["longsleeve","cardigan"],
                          "activity":2,
                          "sun_exposure":1,
                          "sleep":2,
                          "outdoor_hours":1,
                          "created_at":"2026-05-05T10:00:00Z",
                          "updated_at":"2026-05-05T10:00:00Z"
                        }]
                        """.trimIndent(),
                    ),
                    NativeSupabaseProfileResponse(200, """[{"feedback_slot":"evening"}]"""),
                ),
            ),
        )
        val repository = SupabaseFeedbackRepository(
            supabaseUrl = "https://project.supabase.co",
            supabaseAnonKey = "anon-key",
            accessTokenProvider = { "access-token" },
            transport = transport,
        )

        val entries = repository.fetchTodayStatus("user-1", LocalDateTime.of(2026, 5, 5, 13, 0))

        assertEquals(1, entries.size)
        assertEquals(FeedbackSlot.Evening, entries.single().feedbackSlot)
        assertEquals(listOf("longsleeve", "cardigan"), entries.single().clothingItems)
        assertEquals(1, repository.state.feedbackCount)
        assertTrue(transport.requests.first().url.contains("/rest/v1/feedback_entries"))
        assertTrue(transport.requests.first().url.contains("feedback_date=eq.2026-05-05"))
        assertEquals("GET", transport.requests.first().method)
        assertEquals("anon-key", transport.requests.first().headers["apikey"])
        assertEquals("Bearer access-token", transport.requests.first().headers["Authorization"])
    }

    @Test
    fun supabaseFeedbackRepositoryPostsNormalizedFeedbackBody() {
        val transport = RecordingProfileTransport(
            responses = ArrayDeque(
                listOf(
                    NativeSupabaseProfileResponse(
                        201,
                        """
                        [{
                          "id":"entry-1",
                          "user_id":"user-1",
                          "feedback_date":"2026-05-05",
                          "feedback_slot":"morning",
                          "feel_score":7,
                          "humid_feel":1,
                          "wind_feel":3,
                          "clothing":2,
                          "clothing_items":null,
                          "activity":2,
                          "created_at":"2026-05-05T10:00:00Z",
                          "updated_at":"2026-05-05T10:00:00Z"
                        }]
                        """.trimIndent(),
                    ),
                    NativeSupabaseProfileResponse(200, "[]"),
                    NativeSupabaseProfileResponse(200, """[{"feedback_slot":"morning"}]"""),
                ),
            ),
        )
        val repository = SupabaseFeedbackRepository(
            supabaseUrl = "https://project.supabase.co",
            supabaseAnonKey = "anon-key",
            accessTokenProvider = { "access-token" },
            transport = transport,
        )

        val entry = repository.submitFeedback(
            userId = "user-1",
            input = FeedbackInputNative(
                feelScore = 9,
                humidFeel = 0,
                windFeel = 4,
                clothing = 2,
                activity = 2,
                slot = FeedbackSlot.Morning,
            ),
            now = LocalDateTime.of(2026, 5, 5, 13, 0),
        )

        assertEquals(FeedbackSlot.Morning, entry.feedbackSlot)
        assertEquals("POST", transport.requests.first().method)
        assertEquals("return=representation", transport.requests.first().headers["Prefer"])
        assertTrue(transport.requests.first().body?.contains("\"feel_score\":7") == true)
        assertTrue(transport.requests.first().body?.contains("\"humid_feel\":1") == true)
        assertTrue(transport.requests.first().body?.contains("\"wind_feel\":3") == true)
        assertTrue(transport.requests.first().body?.contains("\"clothing_items\":null") == true)
    }

    @Test
    fun fallbackFeedbackRepositoryDoesNotUseLocalFallbackWhenDisabled() {
        val fallback = InMemoryFeedbackRepository()
        val repository = FallbackFeedbackRepository(
            primary = ThrowingFeedbackRepository,
            fallback = fallback,
            allowFallback = false,
        )

        val error = runCatching {
            repository.submitFeedback(userId, sampleInput(slot = FeedbackSlot.Afternoon), morning)
        }.exceptionOrNull()

        assertEquals("remote unavailable", error?.message)
        assertEquals(0, fallback.exportEntries().size)
    }

    @Test
    fun fallbackFeedbackRepositoryUsesLocalFallbackOnlyWhenEnabled() {
        val fallback = InMemoryFeedbackRepository()
        val repository = FallbackFeedbackRepository(
            primary = ThrowingFeedbackRepository,
            fallback = fallback,
            allowFallback = true,
        )

        val entry = repository.submitFeedback(userId, sampleInput(slot = FeedbackSlot.Afternoon), morning)

        assertEquals(FeedbackSlot.Afternoon, entry.feedbackSlot)
        assertEquals(1, fallback.exportEntries().size)
    }

    private fun sampleInput(slot: FeedbackSlot): FeedbackInputNative = FeedbackInputNative(
        feelScore = 4,
        humidFeel = 3,
        windFeel = 1,
        clothing = 2,
        clothingItems = listOf("longsleeve", "cardigan"),
        activity = 2,
        slot = slot,
    )

    private class RecordingProfileTransport(
        private val responses: ArrayDeque<NativeSupabaseProfileResponse>,
    ) : NativeSupabaseProfileTransport {
        val requests = mutableListOf<NativeSupabaseProfileRequest>()

        override fun send(request: NativeSupabaseProfileRequest): NativeSupabaseProfileResponse {
            requests += request
            return responses.removeFirst()
        }
    }

    private object ThrowingFeedbackRepository : FeedbackRepository {
        override fun fetchTodayStatus(userId: String, now: LocalDateTime): List<FeedbackEntryNative> =
            throw IllegalStateException("remote unavailable")

        override fun submitFeedback(userId: String, input: FeedbackInputNative, now: LocalDateTime): FeedbackEntryNative =
            throw IllegalStateException("remote unavailable")

        override fun fetchHistory(userId: String, startDate: String, endDate: String): List<FeedbackEntryNative> =
            throw IllegalStateException("remote unavailable")

        override fun fetchFeedbackCount(userId: String): Int =
            throw IllegalStateException("remote unavailable")
    }
}
