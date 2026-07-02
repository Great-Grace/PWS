package com.wxxtae.pws.nativepreview.domain

import java.time.LocalDateTime
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class FeedbackPersistenceTest {
    private val userId = "dev-pws_dev"
    private val now = LocalDateTime.of(2026, 5, 5, 13, 0)

    @Test
    fun persistentRepositoryRestoresSubmittedFeedbackFromKeyValueStore() {
        val store = InMemoryNativeKeyValueStore()
        val firstRepository = PersistentFeedbackRepository(store)

        val submitted = firstRepository.submitFeedback(
            userId = userId,
            input = FeedbackInputNative(
                feelScore = 4,
                humidFeel = 3,
                windFeel = 1,
                clothing = 2,
                clothingItems = listOf("longsleeve", "cardigan"),
                activity = 2,
                slot = FeedbackSlot.Afternoon,
            ),
            now = now,
        )

        val restoredRepository = PersistentFeedbackRepository(store)
        val restoredToday = restoredRepository.fetchTodayStatus(userId, now)
        restoredRepository.fetchFeedbackCount(userId)

        assertEquals(listOf(submitted), restoredToday)
        assertEquals(1, restoredRepository.state.feedbackCount)
        assertEquals(1, restoredRepository.state.feedbackCountBySlot[FeedbackSlot.Afternoon])
    }

    @Test
    fun persistenceClearRemovesStoredFeedback() {
        val store = InMemoryNativeKeyValueStore()
        val repository = PersistentFeedbackRepository(store)
        repository.submitFeedback(userId, sampleInput(), now)

        repository.clear()
        val restoredRepository = PersistentFeedbackRepository(store)

        assertTrue(restoredRepository.fetchTodayStatus(userId, now).isEmpty())
        assertEquals(0, restoredRepository.fetchFeedbackCount(userId))
    }

    private fun sampleInput(): FeedbackInputNative = FeedbackInputNative(
        feelScore = 4,
        humidFeel = 3,
        windFeel = 1,
        clothing = 2,
        clothingItems = listOf("longsleeve"),
        activity = 2,
        slot = FeedbackSlot.Afternoon,
    )
}
