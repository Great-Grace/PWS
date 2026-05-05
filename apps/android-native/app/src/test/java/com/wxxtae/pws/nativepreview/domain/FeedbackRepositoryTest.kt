package com.wxxtae.pws.nativepreview.domain

import java.time.LocalDateTime
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
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

    private fun sampleInput(slot: FeedbackSlot): FeedbackInputNative = FeedbackInputNative(
        feelScore = 4,
        humidFeel = 3,
        windFeel = 1,
        clothing = 2,
        clothingItems = listOf("longsleeve", "cardigan"),
        activity = 2,
        slot = slot,
    )
}
