package com.wxxtae.pws.nativepreview.domain

import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class NativeSupabaseAuthClientTest {
    @Test
    fun contractBuildsSupabasePasswordGrantRequest() {
        val headers = NativeSupabaseAuthContract.headers(" anon-key ")
        val body = NativeSupabaseAuthContract.body(
            email = " tester@example.com ",
            password = "pw\"\\\n",
        )

        assertEquals(
            "https://project.supabase.co/auth/v1/token?grant_type=password",
            NativeSupabaseAuthContract.endpoint("https://project.supabase.co/"),
        )
        assertEquals("application/json", headers["Content-Type"])
        assertEquals("application/json", headers["Accept"])
        assertEquals("anon-key", headers["apikey"])
        assertEquals("pws-native-android", headers["x-client-info"])
        assertEquals("{\"email\":\"tester@example.com\",\"password\":\"pw\\\"\\\\\\n\"}", body)
    }

    @Test
    fun clientPostsPasswordGrantAndParsesSessionResult() {
        val transport = RecordingAuthTransport(
            NativeSupabaseAuthResponse(
                statusCode = 200,
                body = """
                    {
                      "access_token": "access-token",
                      "refresh_token": "refresh-token",
                      "expires_in": 3600,
                      "expires_at": 1777971036,
                      "token_type": "bearer",
                      "user": {
                        "id": "user-1",
                        "email": "tester@example.com"
                      }
                    }
                """.trimIndent(),
            ),
        )
        val client = NativeSupabaseAuthClient(
            supabaseUrl = "https://project.supabase.co",
            supabaseAnonKey = "anon-key",
            transport = transport,
            nowEpochSeconds = { 1777967436L },
        )

        val result = client.signInWithPasswordResult(
            email = "tester@example.com",
            password = "secret-password",
        )

        assertEquals("https://project.supabase.co/auth/v1/token?grant_type=password", transport.lastRequest?.url)
        assertEquals("anon-key", transport.lastRequest?.headers?.get("apikey"))
        assertEquals(
            "{\"email\":\"tester@example.com\",\"password\":\"secret-password\"}",
            transport.lastRequest?.body,
        )
        assertEquals("access-token", result.session.accessToken)
        assertEquals("refresh-token", result.session.refreshToken)
        assertEquals(1777971036L, result.session.expiresAtEpochSeconds)
        assertEquals("user-1", result.session.userId)
        assertEquals("tester@example.com", result.userEmail)
    }

    @Test
    fun clientComputesExpiryFromExpiresInWhenExpiresAtIsMissing() {
        val transport = RecordingAuthTransport(
            NativeSupabaseAuthResponse(
                statusCode = 200,
                body = """
                    {
                      "access_token": "access-token",
                      "refresh_token": "refresh-token",
                      "expires_in": 120,
                      "user": { "id": "user-1", "email": "tester@example.com" }
                    }
                """.trimIndent(),
            ),
        )
        val client = NativeSupabaseAuthClient(
            supabaseUrl = "https://project.supabase.co",
            supabaseAnonKey = "anon-key",
            transport = transport,
            nowEpochSeconds = { 1_000L },
        )

        val session = client.signInWithPassword(
            email = "tester@example.com",
            password = "secret-password",
        )

        assertEquals(1_120L, session.expiresAtEpochSeconds)
    }

    @Test
    fun clientMapsSupabaseAuthErrorsToKoreanMessages() {
        val transport = RecordingAuthTransport(
            NativeSupabaseAuthResponse(
                statusCode = 400,
                body = """{"error_code":"invalid_credentials","msg":"Invalid login credentials"}""",
            ),
        )
        val client = NativeSupabaseAuthClient(
            supabaseUrl = "https://project.supabase.co",
            supabaseAnonKey = "anon-key",
            transport = transport,
        )

        val error = runCatching {
            client.signInWithPassword(email = "tester@example.com", password = "wrong-password")
        }.exceptionOrNull()

        assertEquals("이메일 또는 비밀번호가 올바르지 않습니다", error?.message)
    }

    @Test
    fun clientMapsRateLimitErrorsToKoreanMessages() {
        val transport = RecordingAuthTransport(
            NativeSupabaseAuthResponse(
                statusCode = 429,
                body = """{"message":"Too many requests"}""",
            ),
        )
        val client = NativeSupabaseAuthClient(
            supabaseUrl = "https://project.supabase.co",
            supabaseAnonKey = "anon-key",
            transport = transport,
        )

        val error = runCatching {
            client.signInWithPassword(email = "tester@example.com", password = "secret-password")
        }.exceptionOrNull()

        assertEquals("로그인 요청이 너무 많습니다. 잠시 후 다시 시도해 주세요", error?.message)
    }

    @Test
    fun contractRejectsMissingTesterInputsWithKoreanMessages() {
        val blankEmail = runCatching {
            NativeSupabaseAuthContract.body(email = " ", password = "password")
        }.exceptionOrNull()
        val blankPassword = runCatching {
            NativeSupabaseAuthContract.body(email = "tester@example.com", password = "")
        }.exceptionOrNull()

        assertEquals("이메일을 입력해 주세요", blankEmail?.message)
        assertEquals("비밀번호를 입력해 주세요", blankPassword?.message)
        assertTrue(blankEmail is IllegalArgumentException)
        assertTrue(blankPassword is IllegalArgumentException)
    }

    private class RecordingAuthTransport(
        private val response: NativeSupabaseAuthResponse,
    ) : NativeSupabaseAuthTransport {
        var lastRequest: NativeSupabaseAuthRequest? = null

        override fun post(request: NativeSupabaseAuthRequest): NativeSupabaseAuthResponse {
            lastRequest = request
            return response
        }
    }
}
