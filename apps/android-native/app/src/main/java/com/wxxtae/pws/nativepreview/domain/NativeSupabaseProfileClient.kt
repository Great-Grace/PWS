package com.wxxtae.pws.nativepreview.domain

import com.wxxtae.pws.nativepreview.BuildConfig
import java.io.BufferedReader
import java.io.InputStreamReader
import java.io.OutputStreamWriter
import java.net.HttpURLConnection
import java.net.URLEncoder
import java.net.URL

private const val NativeSupabaseProfileClientInfo = "pws-native-android"

data class NativeSupabaseProfileRequest(
    val method: String,
    val url: String,
    val headers: Map<String, String>,
    val body: String? = null,
)

data class NativeSupabaseProfileResponse(
    val statusCode: Int,
    val body: String,
)

interface NativeSupabaseProfileTransport {
    fun send(request: NativeSupabaseProfileRequest): NativeSupabaseProfileResponse
}

data class NativeUserRecord(
    val id: String,
    val email: String,
    val nickname: String,
    val defaultLat: Double? = null,
    val defaultLng: Double? = null,
    val climateZone: String? = null,
    val onboardingDone: Boolean = false,
    val birthYear: Int? = null,
    val gender: Gender? = null,
    val notifyEnabled: Boolean = true,
    val notifyOutfit: Boolean = true,
    val notifyRain: Boolean = true,
) {
    fun toNativeUserProfile(): NativeUserProfile {
        val (province, district) = splitClimateZone(climateZone)
        return NativeUserProfile(
            id = id,
            nickname = nickname,
            gender = gender,
            birthYear = birthYear,
            province = province,
            district = district,
            notifyEnabled = notifyEnabled,
            notifyOutfit = notifyOutfit,
            notifyRain = notifyRain,
        )
    }
}

data class NativeUserOnboardingUpsert(
    val id: String,
    val email: String,
    val nickname: String,
    val defaultLat: Double,
    val defaultLng: Double,
    val climateZone: String,
    val birthYear: Int? = null,
    val gender: Gender? = null,
)

data class NativeUserProfileUpdate(
    val nickname: String? = null,
    val defaultLat: Double? = null,
    val defaultLng: Double? = null,
    val climateZone: String? = null,
    val birthYear: Int? = null,
    val gender: Gender? = null,
    val notifyEnabled: Boolean? = null,
    val notifyOutfit: Boolean? = null,
    val notifyRain: Boolean? = null,
)

object NativeSupabaseProfileContract {
    fun baseRestUrl(supabaseUrl: String): String {
        val trimmed = supabaseUrl.trim().trimEnd('/')
        require(trimmed.isNotBlank()) { "Missing required Expo public env: EXPO_PUBLIC_SUPABASE_URL" }
        return "$trimmed/rest/v1/users"
    }

    fun fetchUrl(supabaseUrl: String, userId: String): String =
        "${baseRestUrl(supabaseUrl)}?id=eq.${urlEncode(userId)}&select=*"

    fun updateUrl(supabaseUrl: String, userId: String): String =
        "${baseRestUrl(supabaseUrl)}?id=eq.${urlEncode(userId)}"

    fun upsertUrl(supabaseUrl: String): String =
        "${baseRestUrl(supabaseUrl)}?on_conflict=id"

    fun headers(anonKey: String, accessToken: String, prefer: String? = null): Map<String, String> {
        val normalizedAnonKey = anonKey.trim()
        val normalizedToken = accessToken.trim()
        require(normalizedAnonKey.isNotBlank()) { "Missing required Expo public env: EXPO_PUBLIC_SUPABASE_ANON_KEY" }
        require(normalizedToken.isNotBlank()) { "Supabase access token is required for users profile sync" }
        return buildMap {
            put("Content-Type", "application/json")
            put("Accept", "application/json")
            put("apikey", normalizedAnonKey)
            put("Authorization", "Bearer $normalizedToken")
            put("x-client-info", NativeSupabaseProfileClientInfo)
            if (!prefer.isNullOrBlank()) put("Prefer", prefer)
        }
    }

    fun onboardingBody(record: NativeUserOnboardingUpsert): String = buildJsonObject {
        string("id", record.id)
        string("email", record.email)
        string("nickname", record.nickname)
        number("default_lat", record.defaultLat)
        number("default_lng", record.defaultLng)
        string("climate_zone", record.climateZone)
        bool("onboarding_done", true)
        optionalNumber("birth_year", record.birthYear)
        optionalString("gender", record.gender?.toRemoteValue())
    }

    fun updateBody(update: NativeUserProfileUpdate): String = buildJsonObject {
        optionalString("nickname", update.nickname)
        optionalNumber("default_lat", update.defaultLat)
        optionalNumber("default_lng", update.defaultLng)
        optionalString("climate_zone", update.climateZone)
        optionalNumber("birth_year", update.birthYear)
        optionalString("gender", update.gender?.toRemoteValue())
        optionalBool("notify_enabled", update.notifyEnabled)
        optionalBool("notify_outfit", update.notifyOutfit)
        optionalBool("notify_rain", update.notifyRain)
    }
}

class HttpUrlConnectionNativeSupabaseProfileTransport(
    private val connectTimeoutMs: Int = 10_000,
    private val readTimeoutMs: Int = 10_000,
) : NativeSupabaseProfileTransport {
    override fun send(request: NativeSupabaseProfileRequest): NativeSupabaseProfileResponse {
        val connection = URL(request.url).openConnection() as HttpURLConnection
        return try {
            connection.requestMethod = request.method
            connection.connectTimeout = connectTimeoutMs
            connection.readTimeout = readTimeoutMs
            request.headers.forEach { (key, value) -> connection.setRequestProperty(key, value) }
            if (request.body != null) {
                connection.doOutput = true
                OutputStreamWriter(connection.outputStream, Charsets.UTF_8).use { writer -> writer.write(request.body) }
            }
            val status = connection.responseCode
            val stream = if (status in 200..299) connection.inputStream else connection.errorStream
            val body = stream?.use { input -> BufferedReader(InputStreamReader(input, Charsets.UTF_8)).readText() }.orEmpty()
            NativeSupabaseProfileResponse(statusCode = status, body = body)
        } finally {
            connection.disconnect()
        }
    }
}

class NativeSupabaseProfileClient(
    private val supabaseUrl: String,
    private val supabaseAnonKey: String,
    private val accessTokenProvider: () -> String?,
    private val transport: NativeSupabaseProfileTransport = HttpUrlConnectionNativeSupabaseProfileTransport(),
) {
    fun fetchUserProfile(userId: String): NativeUserRecord? {
        val response = transport.send(
            NativeSupabaseProfileRequest(
                method = "GET",
                url = NativeSupabaseProfileContract.fetchUrl(supabaseUrl, userId),
                headers = NativeSupabaseProfileContract.headers(supabaseAnonKey, requireAccessToken()),
            ),
        )
        if (response.statusCode == 406 || response.body == "[]") return null
        if (response.statusCode !in 200..299) throw IllegalStateException(profileErrorMessage(response.statusCode, response.body))
        return parseUserRecords(response.body).firstOrNull()
    }

    fun upsertOnboarding(record: NativeUserOnboardingUpsert): NativeUserRecord? {
        val response = transport.send(
            NativeSupabaseProfileRequest(
                method = "POST",
                url = NativeSupabaseProfileContract.upsertUrl(supabaseUrl),
                headers = NativeSupabaseProfileContract.headers(
                    supabaseAnonKey,
                    requireAccessToken(),
                    prefer = "resolution=merge-duplicates,return=representation",
                ),
                body = NativeSupabaseProfileContract.onboardingBody(record),
            ),
        )
        if (response.statusCode !in 200..299) throw IllegalStateException(profileErrorMessage(response.statusCode, response.body))
        return parseUserRecords(response.body).firstOrNull()
    }

    fun updateProfile(userId: String, update: NativeUserProfileUpdate): NativeUserRecord? {
        val response = transport.send(
            NativeSupabaseProfileRequest(
                method = "PATCH",
                url = NativeSupabaseProfileContract.updateUrl(supabaseUrl, userId),
                headers = NativeSupabaseProfileContract.headers(
                    supabaseAnonKey,
                    requireAccessToken(),
                    prefer = "return=representation",
                ),
                body = NativeSupabaseProfileContract.updateBody(update),
            ),
        )
        if (response.statusCode !in 200..299) throw IllegalStateException(profileErrorMessage(response.statusCode, response.body))
        return parseUserRecords(response.body).firstOrNull()
    }

    private fun requireAccessToken(): String = accessTokenProvider()?.trim()?.takeIf { it.isNotBlank() }
        ?: throw IllegalStateException("Supabase access token is required for users profile sync")

    companion object {
        fun fromBuildConfigOrNull(
            accessTokenProvider: () -> String?,
            transport: NativeSupabaseProfileTransport = HttpUrlConnectionNativeSupabaseProfileTransport(),
        ): NativeSupabaseProfileClient? {
            val url = BuildConfig.EXPO_PUBLIC_SUPABASE_URL.trim()
            val anonKey = BuildConfig.EXPO_PUBLIC_SUPABASE_ANON_KEY.trim()
            if (url.isBlank() || anonKey.isBlank()) return null
            return NativeSupabaseProfileClient(url, anonKey, accessTokenProvider, transport)
        }
    }
}

private fun profileErrorMessage(statusCode: Int, body: String): String {
    val lower = body.lowercase()
    return when {
        statusCode == 401 || statusCode == 403 -> "프로필 인증이 필요합니다"
        statusCode == 406 || lower.contains("pgrst116") -> "프로필을 찾지 못했습니다"
        statusCode >= 500 -> "프로필 서버 응답을 가져오지 못했습니다"
        else -> "프로필 동기화에 실패했습니다 ($statusCode)"
    }
}

private fun parseUserRecords(body: String): List<NativeUserRecord> {
    val trimmed = body.trim()
    if (trimmed.isBlank() || trimmed == "[]") return emptyList()
    val objects = if (trimmed.startsWith("[")) splitJsonObjects(trimmed) else listOf(trimmed)
    return objects.map { parseUserRecord(it) }
}

private fun parseUserRecord(json: String): NativeUserRecord {
    return NativeUserRecord(
        id = stringField(json, "id") ?: "",
        email = stringField(json, "email") ?: "",
        nickname = stringField(json, "nickname") ?: "테스터",
        defaultLat = doubleField(json, "default_lat"),
        defaultLng = doubleField(json, "default_lng"),
        climateZone = stringField(json, "climate_zone"),
        onboardingDone = boolField(json, "onboarding_done") ?: false,
        birthYear = intField(json, "birth_year"),
        gender = stringField(json, "gender")?.toNativeGender(),
        notifyEnabled = boolField(json, "notify_enabled") ?: true,
        notifyOutfit = boolField(json, "notify_outfit") ?: true,
        notifyRain = boolField(json, "notify_rain") ?: true,
    )
}

private fun splitClimateZone(climateZone: String?): Pair<String?, String?> {
    val parts = climateZone?.trim()?.split(Regex("\\s+"))?.filter { it.isNotBlank() }.orEmpty()
    return when {
        parts.isEmpty() -> null to null
        parts.size == 1 -> parts[0] to null
        else -> parts.first() to parts.drop(1).joinToString(" ")
    }
}

private fun Gender.toRemoteValue(): String = when (this) {
    Gender.Male -> "M"
    Gender.Female -> "F"
    Gender.None -> "N"
}

private fun String.toNativeGender(): Gender? = when (trim().uppercase()) {
    "M" -> Gender.Male
    "F" -> Gender.Female
    "N" -> Gender.None
    else -> null
}

private fun buildJsonObject(block: JsonObjectBuilder.() -> Unit): String = JsonObjectBuilder().apply(block).build()

private class JsonObjectBuilder {
    private val entries = mutableListOf<String>()
    fun string(key: String, value: String) { entries += "\"${jsonEscapeProfile(key)}\":\"${jsonEscapeProfile(value)}\"" }
    fun number(key: String, value: Number) { entries += "\"${jsonEscapeProfile(key)}\":$value" }
    fun bool(key: String, value: Boolean) { entries += "\"${jsonEscapeProfile(key)}\":$value" }
    fun optionalString(key: String, value: String?) { value?.let { string(key, it) } }
    fun optionalNumber(key: String, value: Number?) { value?.let { number(key, it) } }
    fun optionalBool(key: String, value: Boolean?) { value?.let { bool(key, it) } }
    fun build(): String = entries.joinToString(prefix = "{", postfix = "}")
}

private fun stringField(json: String, key: String): String? =
    Regex("\\\"${Regex.escape(key)}\\\"\\s*:\\s*(null|\\\"((?:\\\\.|[^\\\"])*)\\\")").find(json)?.let { match ->
        if (match.groupValues[1] == "null") null else unescapeJsonString(match.groupValues[2])
    }

private fun doubleField(json: String, key: String): Double? =
    Regex("\\\"${Regex.escape(key)}\\\"\\s*:\\s*(-?\\d+(?:\\.\\d+)?)").find(json)?.groupValues?.get(1)?.toDoubleOrNull()

private fun intField(json: String, key: String): Int? = doubleField(json, key)?.toInt()

private fun boolField(json: String, key: String): Boolean? =
    Regex("\\\"${Regex.escape(key)}\\\"\\s*:\\s*(true|false)").find(json)?.groupValues?.get(1)?.toBooleanStrictOrNull()

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

private fun urlEncode(value: String): String = URLEncoder.encode(value, Charsets.UTF_8.name())

private fun jsonEscapeProfile(value: String): String = buildString {
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
