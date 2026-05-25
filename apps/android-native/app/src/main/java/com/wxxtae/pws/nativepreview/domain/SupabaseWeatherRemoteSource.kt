package com.wxxtae.pws.nativepreview.domain

import com.wxxtae.pws.nativepreview.BuildConfig
import java.io.BufferedReader
import java.io.InputStreamReader
import java.io.OutputStreamWriter
import java.net.HttpURLConnection
import java.net.URL
import java.util.Locale

private const val WeatherEdgeFunctionName = "weather-onecall"
private const val NativeWeatherClientInfo = "pws-native-android"

data class WeatherHttpRequest(
    val url: String,
    val headers: Map<String, String>,
    val body: String,
)

data class WeatherHttpResponse(
    val statusCode: Int,
    val body: String,
)

interface WeatherHttpTransport {
    fun post(request: WeatherHttpRequest): WeatherHttpResponse
}

object WeatherEdgeFunctionContract {
    fun endpoint(supabaseUrl: String): String {
        val trimmedUrl = supabaseUrl.trim().trimEnd('/')
        require(trimmedUrl.isNotBlank()) { "Missing required Expo public env: EXPO_PUBLIC_SUPABASE_URL" }
        return "$trimmedUrl/functions/v1/$WeatherEdgeFunctionName"
    }

    fun body(lat: Double, lng: Double): String {
        return String.format(Locale.US, "{\"lat\":%.6f,\"lng\":%.6f}", lat, lng)
    }

    fun headers(anonKey: String, accessToken: String): Map<String, String> {
        val normalizedAnonKey = anonKey.trim()
        val normalizedToken = accessToken.trim()
        require(normalizedAnonKey.isNotBlank()) { "Missing required Expo public env: EXPO_PUBLIC_SUPABASE_ANON_KEY" }
        require(normalizedToken.isNotBlank()) { "Supabase access token is required for weather-onecall" }
        return linkedMapOf(
            "Content-Type" to "application/json",
            "Accept" to "application/json",
            "apikey" to normalizedAnonKey,
            "Authorization" to "Bearer $normalizedToken",
            "x-client-info" to NativeWeatherClientInfo,
        )
    }
}

class HttpUrlConnectionWeatherTransport(
    private val connectTimeoutMs: Int = 10_000,
    private val readTimeoutMs: Int = 10_000,
) : WeatherHttpTransport {
    override fun post(request: WeatherHttpRequest): WeatherHttpResponse {
        val connection = URL(request.url).openConnection() as HttpURLConnection
        return try {
            connection.requestMethod = "POST"
            connection.connectTimeout = connectTimeoutMs
            connection.readTimeout = readTimeoutMs
            connection.doOutput = true
            request.headers.forEach { (key, value) -> connection.setRequestProperty(key, value) }

            OutputStreamWriter(connection.outputStream, Charsets.UTF_8).use { writer ->
                writer.write(request.body)
            }

            val status = connection.responseCode
            val stream = if (status in 200..299) connection.inputStream else connection.errorStream
            val body = stream?.use { input ->
                BufferedReader(InputStreamReader(input, Charsets.UTF_8)).readText()
            }.orEmpty()
            WeatherHttpResponse(statusCode = status, body = body)
        } finally {
            connection.disconnect()
        }
    }
}

class SupabaseEdgeFunctionWeatherRemoteSource(
    private val supabaseUrl: String,
    private val supabaseAnonKey: String,
    private val accessTokenProvider: () -> String?,
    private val transport: WeatherHttpTransport = HttpUrlConnectionWeatherTransport(),
) : WeatherRemoteSource {
    override fun fetchWeather(lat: Double, lng: Double, nowMs: Long): WeatherDataNative {
        val accessToken = accessTokenProvider()?.trim().orEmpty()
        val request = WeatherHttpRequest(
            url = WeatherEdgeFunctionContract.endpoint(supabaseUrl),
            headers = WeatherEdgeFunctionContract.headers(supabaseAnonKey, accessToken),
            body = WeatherEdgeFunctionContract.body(lat, lng),
        )
        val response = transport.post(request)
        if (response.statusCode !in 200..299) {
            throw IllegalStateException(weatherErrorMessage(response.statusCode, response.body))
        }
        return parseWeatherData(response.body, fallbackFetchedAt = nowMs)
    }

    companion object {
        fun fromBuildConfigOrNull(
            accessTokenProvider: () -> String?,
            transport: WeatherHttpTransport = HttpUrlConnectionWeatherTransport(),
        ): SupabaseEdgeFunctionWeatherRemoteSource? {
            val url = BuildConfig.EXPO_PUBLIC_SUPABASE_URL.trim()
            val anonKey = BuildConfig.EXPO_PUBLIC_SUPABASE_ANON_KEY.trim()
            if (url.isBlank() || anonKey.isBlank()) return null
            return SupabaseEdgeFunctionWeatherRemoteSource(
                supabaseUrl = url,
                supabaseAnonKey = anonKey,
                accessTokenProvider = accessTokenProvider,
                transport = transport,
            )
        }
    }
}

private const val PreviewWeatherFallbackWarning = "원격 날씨 실패로 미리보기 데이터를 표시합니다"

interface WeatherFallbackStatus {
    val lastFallbackWarning: String?
}

class FallbackWeatherRemoteSource(
    private val primary: WeatherRemoteSource?,
    private val fallback: WeatherRemoteSource,
    private val allowFallback: Boolean = true,
) : WeatherRemoteSource, WeatherFallbackStatus {
    override var lastFallbackWarning: String? = null
        private set

    override fun fetchWeather(lat: Double, lng: Double, nowMs: Long): WeatherDataNative {
        lastFallbackWarning = null
        if (primary != null) {
            try {
                return primary.fetchWeather(lat, lng, nowMs)
            } catch (error: Throwable) {
                if (!allowFallback) throw error
                lastFallbackWarning = PreviewWeatherFallbackWarning
                // During migration QA, keep the native UI usable until native auth/session sync can
                // provide a real Supabase access token for the weather-onecall Edge Function.
            }
        }
        return fallback.fetchWeather(lat, lng, nowMs)
    }
}

private fun weatherErrorMessage(statusCode: Int, body: String): String {
    val error = runCatching { JsonParser(body).parseObject().optionalString("error") }
        .getOrNull()
        ?.takeIf { it.isNotBlank() }
    return when (error) {
        "unauthorized" -> "날씨 인증이 필요합니다"
        "invalid_coordinates" -> "날씨 좌표가 올바르지 않습니다"
        "server_not_configured" -> "날씨 서버 설정이 완료되지 않았습니다"
        "weather_provider_error" -> "날씨 제공자 응답을 가져오지 못했습니다"
        else -> "날씨 정보를 가져오지 못했습니다 ($statusCode)"
    }
}

private fun parseWeatherData(body: String, fallbackFetchedAt: Long): WeatherDataNative {
    val root = JsonParser(body).parseObject()
    return WeatherDataNative(
        current = parseCurrent(root.requiredObject("current")),
        hourly = parseHourly(root.optionalArray("hourly")),
        daily = parseDaily(root.optionalArray("daily")),
        fetchedAt = root.optionalLong("fetchedAt", fallbackFetchedAt),
    )
}

private fun parseCurrent(json: JsonObject): CurrentWeatherNative {
    return CurrentWeatherNative(
        temp = json.requiredDouble("temp"),
        feelsLike = json.requiredDouble("feels_like"),
        humidity = json.requiredInt("humidity"),
        windSpeed = json.requiredDouble("wind_speed"),
        weatherCode = json.optionalInt("weather_code", 800),
        weatherDescription = json.optionalString("weather_desc", "-"),
        uvIndex = json.optionalDouble("uv_index", 0.0),
        precipitation1h = json.nullableDouble("precipitation_1h"),
        tmrtApi = json.nullableDouble("tmrt_api"),
    )
}

private fun parseHourly(array: JsonArray): List<HourlyForecastNative> {
    return array.objects().map { json ->
        HourlyForecastNative(
            dt = json.requiredLong("dt"),
            temp = json.requiredDouble("temp"),
            feelsLike = json.requiredDouble("feels_like"),
            humidity = json.requiredInt("humidity"),
            windSpeed = json.requiredDouble("wind_speed"),
            weatherCode = json.optionalInt("weather_code", 800),
            weatherDescription = json.optionalString("weather_desc", "-"),
            pop = json.optionalDouble("pop", 0.0),
            precipitation1h = json.nullableDouble("precipitation_1h"),
        )
    }
}

private fun parseDaily(array: JsonArray): List<DailyForecastNative> {
    return array.objects().map { json ->
        DailyForecastNative(
            dt = json.requiredLong("dt"),
            tempMin = json.requiredDouble("temp_min"),
            tempMax = json.requiredDouble("temp_max"),
            humidity = json.requiredInt("humidity"),
            windSpeed = json.requiredDouble("wind_speed"),
            weatherCode = json.optionalInt("weather_code", 800),
            weatherDescription = json.optionalString("weather_desc", "-"),
            weatherIcon = json.optionalString("weather_icon", ""),
            pop = json.optionalDouble("pop", 0.0),
            uvIndex = json.optionalDouble("uv_index", 0.0),
        )
    }
}

private sealed interface JsonValue
private data class JsonObject(val values: Map<String, JsonValue>) : JsonValue
private data class JsonArray(val values: List<JsonValue>) : JsonValue
private data class JsonString(val value: String) : JsonValue
private data class JsonNumber(val value: Double) : JsonValue
private data class JsonBoolean(val value: Boolean) : JsonValue
private data object JsonNull : JsonValue

private fun JsonObject.requiredObject(key: String): JsonObject = values[key] as? JsonObject
    ?: throw IllegalArgumentException("Expected object field: $key")

private fun JsonObject.optionalArray(key: String): JsonArray = values[key] as? JsonArray ?: JsonArray(emptyList())

private fun JsonArray.objects(): List<JsonObject> = values.mapNotNull { it as? JsonObject }

private fun JsonObject.requiredDouble(key: String): Double = numberValue(key)
    ?: throw IllegalArgumentException("Expected number field: $key")

private fun JsonObject.requiredLong(key: String): Long = requiredDouble(key).toLong()

private fun JsonObject.requiredInt(key: String): Int = requiredDouble(key).toInt()

private fun JsonObject.optionalDouble(key: String, fallback: Double): Double = numberValue(key) ?: fallback

private fun JsonObject.optionalLong(key: String, fallback: Long): Long = numberValue(key)?.toLong() ?: fallback

private fun JsonObject.optionalInt(key: String, fallback: Int): Int = numberValue(key)?.toInt() ?: fallback

private fun JsonObject.nullableDouble(key: String): Double? = numberValue(key)

private fun JsonObject.optionalString(key: String, fallback: String = ""): String {
    return when (val value = values[key]) {
        is JsonString -> value.value
        is JsonNumber -> value.value.toString()
        is JsonBoolean -> value.value.toString()
        else -> fallback
    }
}

private fun JsonObject.numberValue(key: String): Double? {
    return when (val value = values[key]) {
        is JsonNumber -> value.value
        is JsonString -> value.value.toDoubleOrNull()
        else -> null
    }
}

private class JsonParser(private val source: String) {
    private var index = 0

    fun parseObject(): JsonObject {
        val value = parseValue()
        skipWhitespace()
        require(index == source.length) { "Trailing JSON content at $index" }
        return value as? JsonObject ?: throw IllegalArgumentException("Expected JSON object")
    }

    private fun parseValue(): JsonValue {
        skipWhitespace()
        return when (peek()) {
            '{' -> parseObjectValue()
            '[' -> parseArrayValue()
            '"' -> JsonString(parseString())
            't' -> parseLiteral("true", JsonBoolean(true))
            'f' -> parseLiteral("false", JsonBoolean(false))
            'n' -> parseLiteral("null", JsonNull)
            else -> parseNumber()
        }
    }

    private fun parseObjectValue(): JsonObject {
        expect('{')
        skipWhitespace()
        if (consumeIf('}')) return JsonObject(emptyMap())
        val values = linkedMapOf<String, JsonValue>()
        while (true) {
            skipWhitespace()
            val key = parseString()
            skipWhitespace()
            expect(':')
            values[key] = parseValue()
            skipWhitespace()
            if (consumeIf('}')) break
            expect(',')
        }
        return JsonObject(values)
    }

    private fun parseArrayValue(): JsonArray {
        expect('[')
        skipWhitespace()
        if (consumeIf(']')) return JsonArray(emptyList())
        val values = mutableListOf<JsonValue>()
        while (true) {
            values += parseValue()
            skipWhitespace()
            if (consumeIf(']')) break
            expect(',')
        }
        return JsonArray(values)
    }

    private fun parseString(): String {
        expect('"')
        val builder = StringBuilder()
        while (index < source.length) {
            val char = source[index++]
            when (char) {
                '"' -> return builder.toString()
                '\\' -> builder.append(parseEscape())
                else -> builder.append(char)
            }
        }
        throw IllegalArgumentException("Unterminated JSON string")
    }

    private fun parseEscape(): Char {
        require(index < source.length) { "Unterminated JSON escape" }
        return when (val escaped = source[index++]) {
            '"', '\\', '/' -> escaped
            'b' -> '\b'
            'f' -> '\u000C'
            'n' -> '\n'
            'r' -> '\r'
            't' -> '\t'
            'u' -> {
                val hex = source.substring(index, index + 4)
                index += 4
                hex.toInt(16).toChar()
            }
            else -> throw IllegalArgumentException("Unsupported JSON escape: $escaped")
        }
    }

    private fun parseNumber(): JsonNumber {
        val start = index
        if (peek() == '-') index++
        while (peekOrNull()?.isDigit() == true) index++
        if (peekOrNull() == '.') {
            index++
            while (peekOrNull()?.isDigit() == true) index++
        }
        if (peekOrNull() == 'e' || peekOrNull() == 'E') {
            index++
            if (peekOrNull() == '+' || peekOrNull() == '-') index++
            while (peekOrNull()?.isDigit() == true) index++
        }
        require(index > start) { "Expected JSON number at $index" }
        return JsonNumber(source.substring(start, index).toDouble())
    }

    private fun parseLiteral(literal: String, value: JsonValue): JsonValue {
        require(source.startsWith(literal, index)) { "Expected JSON literal $literal at $index" }
        index += literal.length
        return value
    }

    private fun skipWhitespace() {
        while (peekOrNull()?.isWhitespace() == true) index++
    }

    private fun expect(expected: Char) {
        require(peek() == expected) { "Expected '$expected' at $index" }
        index++
    }

    private fun consumeIf(expected: Char): Boolean {
        if (peekOrNull() != expected) return false
        index++
        return true
    }

    private fun peek(): Char = peekOrNull() ?: throw IllegalArgumentException("Unexpected end of JSON")

    private fun peekOrNull(): Char? = source.getOrNull(index)
}
