package com.wxxtae.pws.nativepreview.domain

import com.wxxtae.pws.nativepreview.BuildConfig
import java.time.LocalDate
import java.time.LocalDateTime
import java.time.OffsetDateTime
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

    fun clear() {
        entries.clear()
        state = FeedbackRepositoryState()
    }

    override fun fetchTodayStatus(userId: String, now: LocalDateTime): List<FeedbackEntryNative> {
        state = state.copy(isLoading = true)
        val today = PwsFormula.getPwsDate(now)
        val todayEntries = entries
            .filter { it.userId == userId && it.feedbackDate == today }
            .sortedBy { it.feedbackSlot.ordinal }
        state = state.copy(isLoading = false, todayFeedback = todayEntries)
        fetchFeedbackCount(userId)
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
            .sortedWith(compareByDescending<FeedbackEntryNative> { it.feedbackDate }.thenBy { it.feedbackSlot.ordinal })
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

class SupabaseFeedbackRepository(
    private val supabaseUrl: String,
    private val supabaseAnonKey: String,
    private val accessTokenProvider: () -> String?,
    private val transport: NativeSupabaseProfileTransport = HttpUrlConnectionNativeSupabaseProfileTransport(),
) : FeedbackRepository {
    var state: FeedbackRepositoryState = FeedbackRepositoryState()
        private set

    override fun fetchTodayStatus(userId: String, now: LocalDateTime): List<FeedbackEntryNative> {
        state = state.copy(isLoading = true)
        val today = PwsFormula.getPwsDate(now)
        val entries = fetchEntries(
            listOf(
                "user_id" to "eq.$userId",
                "feedback_date" to "eq.$today",
                "select" to "*",
                "order" to "feedback_slot.asc",
            ),
        )
        state = state.copy(isLoading = false, todayFeedback = entries)
        fetchFeedbackCount(userId)
        return entries
    }

    override fun submitFeedback(userId: String, input: FeedbackInputNative, now: LocalDateTime): FeedbackEntryNative {
        state = state.copy(isSaving = true)
        val response = transport.send(
            NativeSupabaseProfileRequest(
                method = "POST",
                url = restUrl("feedback_entries", listOf("select" to "*")),
                headers = headers(prefer = "return=representation"),
                body = feedbackInsertBody(userId, input, now),
            ),
        )
        if (response.statusCode !in 200..299) {
            state = state.copy(isSaving = false)
            throw IllegalStateException(feedbackErrorMessage(response.statusCode, response.body))
        }
        val entry = parseFeedbackEntries(response.body).firstOrNull()
            ?: throw IllegalStateException("피드백 저장 응답을 확인하지 못했습니다")
        state = state.copy(isSaving = false)
        fetchTodayStatus(userId, now)
        return entry
    }

    override fun fetchHistory(userId: String, startDate: String, endDate: String): List<FeedbackEntryNative> {
        val entries = fetchEntries(
            listOf(
                "user_id" to "eq.$userId",
                "feedback_date" to "gte.$startDate",
                "feedback_date" to "lte.$endDate",
                "select" to "*",
                "order" to "feedback_date.desc,feedback_slot.asc",
            ),
        )
        state = state.copy(recentEntries = entries)
        return entries
    }

    override fun fetchFeedbackCount(userId: String): Int {
        val response = transport.send(
            NativeSupabaseProfileRequest(
                method = "GET",
                url = restUrl("feedback_entries", listOf("user_id" to "eq.$userId", "select" to "feedback_slot")),
                headers = headers(),
            ),
        )
        if (response.statusCode !in 200..299) throw IllegalStateException(feedbackErrorMessage(response.statusCode, response.body))
        val slots = parseFeedbackSlotRows(response.body)
        val bySlot = FeedbackSlot.entries.associateWith { slot -> slots.count { it == slot } }
        state = state.copy(feedbackCount = slots.size, feedbackCountBySlot = bySlot)
        return slots.size
    }

    private fun fetchEntries(query: List<Pair<String, String>>): List<FeedbackEntryNative> {
        val response = transport.send(
            NativeSupabaseProfileRequest(
                method = "GET",
                url = restUrl("feedback_entries", query),
                headers = headers(),
            ),
        )
        if (response.statusCode !in 200..299) throw IllegalStateException(feedbackErrorMessage(response.statusCode, response.body))
        return parseFeedbackEntries(response.body)
    }

    private fun headers(prefer: String? = null): Map<String, String> =
        NativeSupabaseProfileContract.headers(supabaseAnonKey, requireAccessToken(), prefer)

    private fun requireAccessToken(): String = accessTokenProvider()?.trim()?.takeIf { it.isNotBlank() }
        ?: throw IllegalStateException("Supabase access token is required for feedback sync")

    private fun restUrl(path: String, query: List<Pair<String, String>>): String {
        val base = supabaseUrl.trim().trimEnd('/')
        require(base.isNotBlank()) { "Missing required Expo public env: EXPO_PUBLIC_SUPABASE_URL" }
        val encoded = query.joinToString("&") { (key, value) -> "${urlEncode(key)}=${urlEncode(value)}" }
        return "$base/rest/v1/$path${if (encoded.isBlank()) "" else "?$encoded"}"
    }

    companion object {
        fun fromBuildConfigOrNull(
            accessTokenProvider: () -> String?,
            transport: NativeSupabaseProfileTransport = HttpUrlConnectionNativeSupabaseProfileTransport(),
        ): SupabaseFeedbackRepository? {
            val url = BuildConfig.EXPO_PUBLIC_SUPABASE_URL.trim()
            val anonKey = BuildConfig.EXPO_PUBLIC_SUPABASE_ANON_KEY.trim()
            if (url.isBlank() || anonKey.isBlank()) return null
            return SupabaseFeedbackRepository(url, anonKey, accessTokenProvider, transport)
        }
    }
}

class FallbackFeedbackRepository(
    private val primary: FeedbackRepository?,
    private val fallback: FeedbackRepository,
    private val allowFallback: Boolean,
) : FeedbackRepository {
    var state: FeedbackRepositoryState = FeedbackRepositoryState()
        private set

    override fun fetchTodayStatus(userId: String, now: LocalDateTime): List<FeedbackEntryNative> =
        runWithFallback({ it.fetchTodayStatus(userId, now) }, { it.fetchTodayStatus(userId, now) })

    override fun submitFeedback(userId: String, input: FeedbackInputNative, now: LocalDateTime): FeedbackEntryNative =
        runWithFallback({ it.submitFeedback(userId, input, now) }, { it.submitFeedback(userId, input, now) })

    override fun fetchHistory(userId: String, startDate: String, endDate: String): List<FeedbackEntryNative> =
        runWithFallback({ it.fetchHistory(userId, startDate, endDate) }, { it.fetchHistory(userId, startDate, endDate) })

    override fun fetchFeedbackCount(userId: String): Int =
        runWithFallback({ it.fetchFeedbackCount(userId) }, { it.fetchFeedbackCount(userId) })

    fun clearLocal() {
        when (fallback) {
            is PersistentFeedbackRepository -> fallback.clear()
            is InMemoryFeedbackRepository -> fallback.clear()
            is FallbackFeedbackRepository -> fallback.clearLocal()
        }
        state = FeedbackRepositoryState()
    }

    private fun <T> runWithFallback(primaryBlock: (FeedbackRepository) -> T, fallbackBlock: (FeedbackRepository) -> T): T {
        if (primary != null) {
            try {
                val result = primaryBlock(primary)
                state = repositoryState(primary)
                return result
            } catch (error: Throwable) {
                if (!allowFallback) throw error
            }
        }
        val result = fallbackBlock(fallback)
        state = repositoryState(fallback)
        return result
    }

    private fun repositoryState(repository: FeedbackRepository): FeedbackRepositoryState = when (repository) {
        is SupabaseFeedbackRepository -> repository.state
        is PersistentFeedbackRepository -> repository.state
        is InMemoryFeedbackRepository -> repository.state
        is FallbackFeedbackRepository -> repository.state
        else -> state
    }
}

private fun feedbackInsertBody(userId: String, input: FeedbackInputNative, now: LocalDateTime): String = buildString {
    val fields = mutableListOf<Pair<String, String>>()
    fun string(key: String, value: String) { fields += key to "\"${jsonEscape(value)}\"" }
    fun number(key: String, value: Number) { fields += key to value.toString() }
    fun optionalNumber(key: String, value: Number?) { if (value != null) number(key, value) }
    string("user_id", userId)
    string("feedback_date", PwsFormula.getPwsDate(now))
    string("feedback_slot", (input.slot ?: FeedbackSlot.Afternoon).toRemoteFeedbackSlot())
    number("feel_score", input.feelScore.coerceIn(1, 7))
    number("humid_feel", input.humidFeel.coerceIn(1, 5))
    number("wind_feel", input.windFeel.coerceIn(0, 3))
    number("clothing", input.clothing.coerceIn(1, 3))
    if (input.clothingItems.isEmpty()) {
        fields += "clothing_items" to "null"
    } else {
        fields += "clothing_items" to input.clothingItems.joinToString(prefix = "[", postfix = "]") { "\"${jsonEscape(it)}\"" }
    }
    number("activity", input.activity.coerceIn(1, 3))
    optionalNumber("sun_exposure", input.sunExposure)
    optionalNumber("sleep", input.sleep)
    optionalNumber("outdoor_hours", input.outdoorHours)
    append(fields.joinToString(prefix = "{", postfix = "}") { (key, value) -> "\"${jsonEscape(key)}\":$value" })
}

private fun parseFeedbackEntries(body: String): List<FeedbackEntryNative> {
    val trimmed = body.trim()
    if (trimmed.isBlank() || trimmed == "[]") return emptyList()
    val objects = if (trimmed.startsWith("[")) splitJsonObjects(trimmed) else listOf(trimmed)
    return objects.map { json ->
        FeedbackEntryNative(
            id = stringField(json, "id") ?: "",
            userId = stringField(json, "user_id") ?: "",
            feedbackDate = stringField(json, "feedback_date") ?: "",
            feedbackSlot = stringField(json, "feedback_slot").toFeedbackSlot(),
            feelScore = intField(json, "feel_score") ?: 0,
            humidFeel = intField(json, "humid_feel") ?: 0,
            windFeel = intField(json, "wind_feel") ?: 0,
            clothing = intField(json, "clothing") ?: 0,
            clothingItems = stringArrayField(json, "clothing_items"),
            activity = intField(json, "activity") ?: 0,
            sunExposure = intField(json, "sun_exposure"),
            sleep = intField(json, "sleep"),
            outdoorHours = intField(json, "outdoor_hours"),
            actualTemp = doubleField(json, "actual_temp"),
            actualHumidity = intField(json, "actual_humidity"),
            actualWind = doubleField(json, "actual_wind"),
            actualPrecip = doubleField(json, "actual_precip"),
            createdAt = dateTimeField(json, "created_at"),
            updatedAt = dateTimeField(json, "updated_at"),
        )
    }
}

private fun parseFeedbackSlotRows(body: String): List<FeedbackSlot> {
    val trimmed = body.trim()
    if (trimmed.isBlank() || trimmed == "[]") return emptyList()
    return splitJsonObjects(trimmed).map { stringField(it, "feedback_slot").toFeedbackSlot() }
}

private fun String?.toFeedbackSlot(): FeedbackSlot = when (this?.trim()?.lowercase()) {
    "morning" -> FeedbackSlot.Morning
    "evening" -> FeedbackSlot.Evening
    else -> FeedbackSlot.Afternoon
}

private fun FeedbackSlot.toRemoteFeedbackSlot(): String = when (this) {
    FeedbackSlot.Morning -> "morning"
    FeedbackSlot.Afternoon -> "afternoon"
    FeedbackSlot.Evening -> "evening"
}

private fun dateTimeField(json: String, key: String): LocalDateTime =
    stringField(json, key)
        ?.let { value -> runCatching { OffsetDateTime.parse(value).toLocalDateTime() }.getOrNull() ?: runCatching { LocalDateTime.parse(value) }.getOrNull() }
        ?: LocalDateTime.MIN

private fun stringArrayField(json: String, key: String): List<String>? {
    val match = Regex("\\\"${Regex.escape(key)}\\\"\\s*:\\s*(null|\\[((?:\\s*\\\"(?:\\\\.|[^\\\"])*\\\"\\s*,?\\s*)*)\\])").find(json)
        ?: return null
    if (match.groupValues[1] == "null") return null
    return Regex("\\\"((?:\\\\.|[^\\\"])*)\\\"").findAll(match.groupValues[2]).map { unescapeJsonString(it.groupValues[1]) }.toList()
}

private fun stringField(json: String, key: String): String? =
    Regex("\\\"${Regex.escape(key)}\\\"\\s*:\\s*(null|\\\"((?:\\\\.|[^\\\"])*)\\\")").find(json)?.let { match ->
        if (match.groupValues[1] == "null") null else unescapeJsonString(match.groupValues[2])
    }

private fun doubleField(json: String, key: String): Double? =
    Regex("\\\"${Regex.escape(key)}\\\"\\s*:\\s*(-?\\d+(?:\\.\\d+)?)").find(json)?.groupValues?.get(1)?.toDoubleOrNull()

private fun intField(json: String, key: String): Int? = doubleField(json, key)?.toInt()

private fun splitJsonObjects(jsonArray: String): List<String> {
    val result = mutableListOf<String>()
    var depth = 0
    var start = -1
    var inString = false
    var escaped = false
    jsonArray.forEachIndexed { index, char ->
        if (escaped) { escaped = false; return@forEachIndexed }
        if (char == '\\' && inString) { escaped = true; return@forEachIndexed }
        if (char == '"') inString = !inString
        if (inString) return@forEachIndexed
        if (char == '{') {
            if (depth == 0) start = index
            depth++
        } else if (char == '}') {
            depth--
            if (depth == 0 && start >= 0) result += jsonArray.substring(start, index + 1)
        }
    }
    return result
}

private fun feedbackErrorMessage(statusCode: Int, body: String): String {
    val lower = body.lowercase()
    return when {
        statusCode == 401 || statusCode == 403 -> "피드백 인증이 필요합니다"
        lower.contains("duplicate") || statusCode == 409 -> "이미 저장된 피드백 슬롯입니다"
        statusCode >= 500 -> "피드백 서버 응답을 가져오지 못했습니다"
        else -> "피드백 동기화에 실패했습니다 ($statusCode)"
    }
}

private fun urlEncode(value: String): String = java.net.URLEncoder.encode(value, Charsets.UTF_8.name())

private fun jsonEscape(value: String): String = buildString {
    value.forEach { char ->
        when (char) {
            '\\' -> append("\\\\")
            '"' -> append("\\\"")
            '\n' -> append("\\n")
            '\r' -> append("\\r")
            '\t' -> append("\\t")
            else -> append(char)
        }
    }
}

private fun unescapeJsonString(value: String): String = buildString {
    var index = 0
    while (index < value.length) {
        val char = value[index++]
        if (char != '\\' || index >= value.length) {
            append(char)
            continue
        }
        when (val escaped = value[index++]) {
            '"', '\\', '/' -> append(escaped)
            'n' -> append('\n')
            'r' -> append('\r')
            't' -> append('\t')
            'b' -> append('\b')
            'f' -> append('\u000C')
            'u' -> {
                val hex = value.substring(index, index + 4)
                append(hex.toInt(16).toChar())
                index += 4
            }
            else -> append(escaped)
        }
    }
}
