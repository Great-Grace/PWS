package com.wxxtae.pws.nativepreview.domain

import java.time.LocalDate
import java.time.LocalDateTime
import java.util.UUID

data class FeedbackInputNative(
    val feelScore: Int,
    val humidFeel: Int,
    val windFeel: Int,
    val clothing: Int,
    val clothingItems: List<String> = emptyList(),
    val activity: Int,
    val sunExposure: Int? = null,
    val sleep: Int? = null,
    val outdoorHours: Int? = null,
    val slot: FeedbackSlot? = null,
)

data class FeedbackEntryNative(
    val id: String,
    val userId: String,
    val feedbackDate: String,
    val feedbackSlot: FeedbackSlot,
    val feelScore: Int,
    val humidFeel: Int,
    val windFeel: Int,
    val clothing: Int,
    val clothingItems: List<String>?,
    val activity: Int,
    val sunExposure: Int?,
    val sleep: Int?,
    val outdoorHours: Int?,
    val actualTemp: Double? = null,
    val actualHumidity: Int? = null,
    val actualWind: Double? = null,
    val actualPrecip: Double? = null,
    val createdAt: LocalDateTime,
    val updatedAt: LocalDateTime,
)

data class FeedbackRepositoryState(
    val todayFeedback: List<FeedbackEntryNative> = emptyList(),
    val recentEntries: List<FeedbackEntryNative> = emptyList(),
    val feedbackCount: Int = 0,
    val feedbackCountBySlot: Map<FeedbackSlot, Int> = FeedbackSlot.entries.associateWith { 0 },
    val isLoading: Boolean = false,
    val isSaving: Boolean = false,
)

interface FeedbackRepository {
    fun fetchTodayStatus(userId: String, now: LocalDateTime = LocalDateTime.now()): List<FeedbackEntryNative>
    fun submitFeedback(userId: String, input: FeedbackInputNative, now: LocalDateTime = LocalDateTime.now()): FeedbackEntryNative
    fun fetchHistory(userId: String, startDate: String, endDate: String): List<FeedbackEntryNative>
    fun fetchFeedbackCount(userId: String): Int
}

class InMemoryFeedbackRepository(
    initialEntries: List<FeedbackEntryNative> = emptyList(),
) : FeedbackRepository {
    private val entries = initialEntries.toMutableList()

    var state: FeedbackRepositoryState = FeedbackRepositoryState()
        private set

    fun exportEntries(): List<FeedbackEntryNative> = entries.toList()

    override fun fetchTodayStatus(userId: String, now: LocalDateTime): List<FeedbackEntryNative> {
        state = state.copy(isLoading = true)
        val today = PwsFormula.getPwsDate(now)
        val todayEntries = entries
            .filter { it.userId == userId && it.feedbackDate == today }
            .sortedBy { it.feedbackSlot.ordinal }
        state = state.copy(isLoading = false, todayFeedback = todayEntries)
        return todayEntries
    }

    override fun submitFeedback(userId: String, input: FeedbackInputNative, now: LocalDateTime): FeedbackEntryNative {
        state = state.copy(isSaving = true)
        val slot = input.slot ?: FeedbackSlot.Afternoon
        val entry = FeedbackEntryNative(
            id = UUID.nameUUIDFromBytes("$userId:${PwsFormula.getPwsDate(now)}:$slot:${entries.size}".toByteArray()).toString(),
            userId = userId,
            feedbackDate = PwsFormula.getPwsDate(now),
            feedbackSlot = slot,
            feelScore = input.feelScore.coerceIn(1, 7),
            humidFeel = input.humidFeel.coerceIn(1, 5),
            windFeel = input.windFeel.coerceIn(0, 3),
            clothing = input.clothing.coerceIn(1, 3),
            clothingItems = input.clothingItems.takeIf { it.isNotEmpty() },
            activity = input.activity.coerceIn(1, 3),
            sunExposure = input.sunExposure,
            sleep = input.sleep,
            outdoorHours = input.outdoorHours,
            createdAt = now,
            updatedAt = now,
        )
        entries += entry
        state = state.copy(isSaving = false)
        fetchTodayStatus(userId, now)
        fetchFeedbackCount(userId)
        return entry
    }

    override fun fetchHistory(userId: String, startDate: String, endDate: String): List<FeedbackEntryNative> {
        val start = LocalDate.parse(startDate)
        val end = LocalDate.parse(endDate)
        val history = entries
            .filter { it.userId == userId }
            .filter { entry ->
                val date = LocalDate.parse(entry.feedbackDate)
                !date.isBefore(start) && !date.isAfter(end)
            }
            .sortedWith(compareBy<FeedbackEntryNative> { it.feedbackDate }.thenBy { it.feedbackSlot.ordinal })
        state = state.copy(recentEntries = history)
        return history
    }

    override fun fetchFeedbackCount(userId: String): Int {
        val userEntries = entries.filter { it.userId == userId }
        val bySlot = FeedbackSlot.entries.associateWith { slot -> userEntries.count { it.feedbackSlot == slot } }
        state = state.copy(feedbackCount = userEntries.size, feedbackCountBySlot = bySlot)
        return userEntries.size
    }
}
