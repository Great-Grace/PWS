package com.wxxtae.pws.nativepreview.domain

import java.time.LocalDateTime

private const val FeedbackEntriesKey = "pws.feedback.entries.v1"
private const val EntrySeparator = "\u001e"
private const val FieldSeparator = "\u001f"

class FeedbackPersistence(
    private val keyValueStore: NativeKeyValueStore,
) {
    fun save(entries: List<FeedbackEntryNative>) {
        if (entries.isEmpty()) {
            keyValueStore.remove(FeedbackEntriesKey)
            return
        }
        keyValueStore.putString(FeedbackEntriesKey, entries.joinToString(EntrySeparator) { it.encode() })
    }

    fun load(): List<FeedbackEntryNative> = keyValueStore
        .getString(FeedbackEntriesKey)
        ?.takeIf { it.isNotBlank() }
        ?.split(EntrySeparator)
        ?.mapNotNull { encoded -> encoded.decodeFeedbackEntryOrNull() }
        .orEmpty()
}

class PersistentFeedbackRepository(
    private val keyValueStore: NativeKeyValueStore,
) : FeedbackRepository {
    private var delegate = InMemoryFeedbackRepository(FeedbackPersistence(keyValueStore).load())
    private val persistence = FeedbackPersistence(keyValueStore)

    val state: FeedbackRepositoryState
        get() = delegate.state

    override fun fetchTodayStatus(userId: String, now: LocalDateTime): List<FeedbackEntryNative> = delegate.fetchTodayStatus(userId, now)

    override fun submitFeedback(userId: String, input: FeedbackInputNative, now: LocalDateTime): FeedbackEntryNative {
        val entry = delegate.submitFeedback(userId, input, now)
        persistence.save(delegate.allEntries())
        return entry
    }

    override fun fetchHistory(userId: String, startDate: String, endDate: String): List<FeedbackEntryNative> =
        delegate.fetchHistory(userId, startDate, endDate)

    override fun fetchFeedbackCount(userId: String): Int = delegate.fetchFeedbackCount(userId)

    fun clear() {
        keyValueStore.remove(FeedbackEntriesKey)
        delegate = InMemoryFeedbackRepository()
    }
}

fun InMemoryFeedbackRepository.allEntries(): List<FeedbackEntryNative> = exportEntries()

private fun FeedbackEntryNative.encode(): String = listOf(
    id,
    userId,
    feedbackDate,
    feedbackSlot.name,
    feelScore.toString(),
    humidFeel.toString(),
    windFeel.toString(),
    clothing.toString(),
    clothingItems?.joinToString(",").orEmpty(),
    activity.toString(),
    sunExposure?.toString().orEmpty(),
    sleep?.toString().orEmpty(),
    outdoorHours?.toString().orEmpty(),
    createdAt.toString(),
    updatedAt.toString(),
).joinToString(FieldSeparator) { it.escapeField() }

private fun String.decodeFeedbackEntryOrNull(): FeedbackEntryNative? {
    val fields = split(FieldSeparator).map { it.unescapeField() }
    if (fields.size != 15) return null
    return runCatching {
        FeedbackEntryNative(
            id = fields[0],
            userId = fields[1],
            feedbackDate = fields[2],
            feedbackSlot = FeedbackSlot.valueOf(fields[3]),
            feelScore = fields[4].toInt(),
            humidFeel = fields[5].toInt(),
            windFeel = fields[6].toInt(),
            clothing = fields[7].toInt(),
            clothingItems = fields[8].takeIf { it.isNotBlank() }?.split(",")?.filter { it.isNotBlank() },
            activity = fields[9].toInt(),
            sunExposure = fields[10].toIntOrNull(),
            sleep = fields[11].toIntOrNull(),
            outdoorHours = fields[12].toIntOrNull(),
            createdAt = LocalDateTime.parse(fields[13]),
            updatedAt = LocalDateTime.parse(fields[14]),
        )
    }.getOrNull()
}

private fun String.escapeField(): String = replace("%", "%25")
    .replace(FieldSeparator, "%1F")
    .replace(EntrySeparator, "%1E")
    .replace(",", "%2C")

private fun String.unescapeField(): String = replace("%2C", ",")
    .replace("%1E", EntrySeparator)
    .replace("%1F", FieldSeparator)
    .replace("%25", "%")
