package com.wxxtae.pws.nativepreview.domain

import java.io.BufferedReader
import java.io.InputStreamReader
import java.io.OutputStreamWriter
import java.net.HttpURLConnection
import java.net.URL

private const val NativeSupabaseAuthClientInfo = "pws-native-android"

data class NativeSupabaseAuthRequest(
    val url: String,
    val headers: Map<String, String>,
    val body: String,
)

data class NativeSupabaseAuthResponse(
    val statusCode: Int,
    val body: String,
)

interface NativeSupabaseAuthTransport {
    fun post(request: NativeSupabaseAuthRequest): NativeSupabaseAuthResponse
}

data class NativeSupabaseAuthResult(
    val session: NativeSupabaseSession,
    val userEmail: String? = null,
)

object NativeSupabaseAuthContract {
    fun endpoint(supabaseUrl: String): String {
        val trimmedUrl = supabaseUrl.trim().trimEnd('/')
        require(trimmedUrl.isNotBlank()) { "Missing required Expo public env: EXPO_PUBLIC_SUPABASE_URL" }
        return "$trimmedUrl/auth/v1/token?grant_type=password"
    }

    fun headers(anonKey: String): Map<String, String> {
        val normalizedAnonKey = anonKey.trim()
        require(normalizedAnonKey.isNotBlank()) { "Missing required Expo public env: EXPO_PUBLIC_SUPABASE_ANON_KEY" }
        return linkedMapOf(
            "Content-Type" to "application/json",
            "Accept" to "application/json",
            "apikey" to normalizedAnonKey,
            "x-client-info" to NativeSupabaseAuthClientInfo,
        )
    }

    fun body(email: String, password: String): String {
        val normalizedEmail = email.trim()
        require(normalizedEmail.isNotBlank()) { "이메일을 입력해 주세요" }
        require(password.isNotBlank()) { "비밀번호를 입력해 주세요" }
        return "{\"email\":\"${jsonEscape(normalizedEmail)}\",\"password\":\"${jsonEscape(password)}\"}"
    }
}

class HttpUrlConnectionNativeSupabaseAuthTransport(
    private val connectTimeoutMs: Int = 10_000,
    private val readTimeoutMs: Int = 10_000,
) : NativeSupabaseAuthTransport {
    override fun post(request: NativeSupabaseAuthRequest): NativeSupabaseAuthResponse {
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
            NativeSupabaseAuthResponse(statusCode = status, body = body)
        } finally {
            connection.disconnect()
        }
    }
}

class NativeSupabaseAuthClient(
    private val supabaseUrl: String,
    private val supabaseAnonKey: String,
    private val transport: NativeSupabaseAuthTransport = HttpUrlConnectionNativeSupabaseAuthTransport(),
    private val nowEpochSeconds: () -> Long = { System.currentTimeMillis() / 1000 },
) {
    fun signInWithPassword(email: String, password: String): NativeSupabaseSession {
        return signInWithPasswordResult(email, password).session
    }

    fun signInWithPasswordResult(email: String, password: String): NativeSupabaseAuthResult {
        val response = transport.post(
            NativeSupabaseAuthRequest(
                url = NativeSupabaseAuthContract.endpoint(supabaseUrl),
                headers = NativeSupabaseAuthContract.headers(supabaseAnonKey),
                body = NativeSupabaseAuthContract.body(email, password),
            ),
        )
        if (response.statusCode !in 200..299) {
            throw IllegalStateException(nativeSupabaseAuthErrorMessage(response.statusCode, response.body))
        }
        return parseNativeSupabaseAuthResult(response.body, nowEpochSeconds())
    }
}

private fun parseNativeSupabaseAuthResult(body: String, nowEpochSeconds: Long): NativeSupabaseAuthResult {
    val root = NativeSupabaseAuthJsonParser(body).parseObject()
    val accessToken = root.requiredString("access_token").trim()
    val expiresAt = root.optionalLong("expires_at")
        ?: root.optionalLong("expires_in")?.let { expiresIn -> nowEpochSeconds + expiresIn }
    val user = root.optionalObject("user")
    val userId = user?.optionalString("id")?.trim()?.takeIf { it.isNotBlank() }
    val userEmail = user?.optionalString("email")?.trim()?.takeIf { it.isNotBlank() }
    return NativeSupabaseAuthResult(
        session = NativeSupabaseSession(
            accessToken = accessToken,
            refreshToken = root.optionalString("refresh_token")?.trim()?.takeIf { it.isNotBlank() },
            expiresAtEpochSeconds = expiresAt,
            userId = userId,
        ),
        userEmail = userEmail,
    )
}

private fun nativeSupabaseAuthErrorMessage(statusCode: Int, body: String): String {
    val errorText = runCatching {
        val root = NativeSupabaseAuthJsonParser(body).parseObject()
        listOfNotNull(
            root.optionalString("error_code"),
            root.optionalString("error"),
            root.optionalString("msg"),
            root.optionalString("message"),
        ).joinToString(" ").lowercase()
    }.getOrDefault("")

    return when {
        statusCode == 400 && errorText.contains("invalid_credentials") -> "이메일 또는 비밀번호가 올바르지 않습니다"
        statusCode == 400 && errorText.contains("email_not_confirmed") -> "이메일 인증을 완료해 주세요"
        statusCode == 400 && errorText.contains("signup_disabled") -> "테스터 로그인이 현재 비활성화되어 있습니다"
        statusCode == 401 || errorText.contains("invalid api key") -> "Supabase 인증 설정을 확인해 주세요"
        statusCode == 429 || errorText.contains("rate") -> "로그인 요청이 너무 많습니다. 잠시 후 다시 시도해 주세요"
        statusCode >= 500 -> "로그인 서버 응답을 가져오지 못했습니다"
        else -> "로그인에 실패했습니다 ($statusCode)"
    }
}

private sealed interface NativeSupabaseAuthJsonValue
private data class NativeSupabaseAuthJsonObject(
    val values: Map<String, NativeSupabaseAuthJsonValue>,
) : NativeSupabaseAuthJsonValue

private data class NativeSupabaseAuthJsonString(val value: String) : NativeSupabaseAuthJsonValue
private data class NativeSupabaseAuthJsonNumber(val value: Double) : NativeSupabaseAuthJsonValue
private data class NativeSupabaseAuthJsonArray(
    val values: List<NativeSupabaseAuthJsonValue>,
) : NativeSupabaseAuthJsonValue

private data class NativeSupabaseAuthJsonBoolean(val value: Boolean) : NativeSupabaseAuthJsonValue
private data object NativeSupabaseAuthJsonNull : NativeSupabaseAuthJsonValue

private fun NativeSupabaseAuthJsonObject.requiredString(key: String): String {
    return optionalString(key) ?: throw IllegalArgumentException("Expected string field: $key")
}

private fun NativeSupabaseAuthJsonObject.optionalString(key: String): String? {
    return when (val value = values[key]) {
        is NativeSupabaseAuthJsonString -> value.value
        is NativeSupabaseAuthJsonNumber -> value.value.toLong().takeIf { value.value == it.toDouble() }?.toString()
            ?: value.value.toString()
        is NativeSupabaseAuthJsonBoolean -> value.value.toString()
        else -> null
    }
}

private fun NativeSupabaseAuthJsonObject.optionalLong(key: String): Long? {
    return when (val value = values[key]) {
        is NativeSupabaseAuthJsonNumber -> value.value.toLong()
        is NativeSupabaseAuthJsonString -> value.value.toLongOrNull()
        else -> null
    }
}

private fun NativeSupabaseAuthJsonObject.optionalObject(key: String): NativeSupabaseAuthJsonObject? {
    return values[key] as? NativeSupabaseAuthJsonObject
}

private class NativeSupabaseAuthJsonParser(private val source: String) {
    private var index = 0

    fun parseObject(): NativeSupabaseAuthJsonObject {
        val value = parseValue()
        skipWhitespace()
        require(index == source.length) { "Trailing JSON content at $index" }
        return value as? NativeSupabaseAuthJsonObject ?: throw IllegalArgumentException("Expected JSON object")
    }

    private fun parseValue(): NativeSupabaseAuthJsonValue {
        skipWhitespace()
        return when (peek()) {
            '{' -> parseObjectValue()
            '[' -> parseArrayValue()
            '"' -> NativeSupabaseAuthJsonString(parseString())
            't' -> parseLiteral("true", NativeSupabaseAuthJsonBoolean(true))
            'f' -> parseLiteral("false", NativeSupabaseAuthJsonBoolean(false))
            'n' -> parseLiteral("null", NativeSupabaseAuthJsonNull)
            else -> parseNumber()
        }
    }

    private fun parseObjectValue(): NativeSupabaseAuthJsonObject {
        expect('{')
        skipWhitespace()
        if (consumeIf('}')) return NativeSupabaseAuthJsonObject(emptyMap())
        val values = linkedMapOf<String, NativeSupabaseAuthJsonValue>()
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
        return NativeSupabaseAuthJsonObject(values)
    }

    private fun parseArrayValue(): NativeSupabaseAuthJsonArray {
        expect('[')
        skipWhitespace()
        if (consumeIf(']')) return NativeSupabaseAuthJsonArray(emptyList())
        val values = mutableListOf<NativeSupabaseAuthJsonValue>()
        while (true) {
            values += parseValue()
            skipWhitespace()
            if (consumeIf(']')) break
            expect(',')
        }
        return NativeSupabaseAuthJsonArray(values)
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
                require(index + 4 <= source.length) { "Unterminated JSON unicode escape" }
                val hex = source.substring(index, index + 4)
                index += 4
                hex.toInt(16).toChar()
            }
            else -> throw IllegalArgumentException("Unsupported JSON escape: $escaped")
        }
    }

    private fun parseNumber(): NativeSupabaseAuthJsonNumber {
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
        return NativeSupabaseAuthJsonNumber(source.substring(start, index).toDouble())
    }

    private fun parseLiteral(
        literal: String,
        value: NativeSupabaseAuthJsonValue,
    ): NativeSupabaseAuthJsonValue {
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

private fun jsonEscape(value: String): String {
    val builder = StringBuilder(value.length)
    value.forEach { char ->
        when (char) {
            '\\' -> builder.append("\\\\")
            '"' -> builder.append("\\\"")
            '\b' -> builder.append("\\b")
            '\u000C' -> builder.append("\\f")
            '\n' -> builder.append("\\n")
            '\r' -> builder.append("\\r")
            '\t' -> builder.append("\\t")
            else -> {
                if (char < ' ') {
                    builder.append("\\u")
                    builder.append(char.code.toString(16).padStart(4, '0'))
                } else {
                    builder.append(char)
                }
            }
        }
    }
    return builder.toString()
}
