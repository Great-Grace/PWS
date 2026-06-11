package com.wxxtae.pws.nativepreview.domain

import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class HistorySummaryTest {
    @Test
    fun emptyHistorySummaryPromptsFirstFeedback() {
        val summary = HistorySummaryFactory.from(FeedbackRepositoryState())

        assertEquals("누적 기록", summary.metrics.first().label)
        assertEquals("0개", summary.metrics.first().value)
        assertTrue(summary.trendMessage.contains("아직 기록이 없어요"))
    }

    @Test
    fun historySummaryReflectsRepositoryCountsAndDominantSlot() {
        val summary = HistorySummaryFactory.from(
            FeedbackRepositoryState(
                feedbackCount = 3,
                feedbackCountBySlot = mapOf(
                    FeedbackSlot.Morning to 1,
                    FeedbackSlot.Afternoon to 2,
                    FeedbackSlot.Evening to 0,
                ),
            ),
        )

        assertEquals(listOf("3개", "1개", "2개", "0개"), summary.metrics.map { it.value })
        assertTrue(summary.trendMessage.contains("낮 시간대 기록이 가장 많아요"))
        assertTrue(summary.trendMessage.contains("총 3개의 체감 기록"))
    }
}
