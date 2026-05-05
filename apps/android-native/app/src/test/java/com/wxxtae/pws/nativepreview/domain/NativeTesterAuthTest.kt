package com.wxxtae.pws.nativepreview.domain

import org.junit.Assert.assertEquals
import org.junit.Test

class NativeTesterAuthTest {
    @Test
    fun testerBridgeSignsInWithNormalizedTesterEmailAndStoresSession() {
        val store = NativeSupabaseSessionStore(InMemoryNativeKeyValueStore())
        val transport = RecordingAuthTransport(
            NativeSupabaseAuthResponse(
                statusCode = 200,
                body = """
                    {
                      "access_token": "access-token",
                      "refresh_token": "refresh-token",
                      "expires_in": 3600,
                      "user": { "id": "user-1", "email": "pws_dev@test.pws" }
                    }
                """.trimIndent(),
            ),
        )
        val bridge = NativeTesterAuthBridge(
            authClient = NativeSupabaseAuthClient(
                supabaseUrl = "https://project.supabase.co",
                supabaseAnonKey = "anon-key",
                transport = transport,
                nowEpochSeconds = { 1_000L },
            ),
            sessionStore = store,
            testerPassword = " managed-secret ",
        )

        val result = bridge.signInTester(" PWS_DEV ")

        assertEquals("pws_dev", result.testerId)
        assertEquals("pws_dev@test.pws", result.userEmail)
        assertEquals("access-token", result.session.accessToken)
        assertEquals("access-token", store.getValidAccessToken(nowEpochSeconds = 1_100L))
        assertEquals(
            "{\"email\":\"pws_dev@test.pws\",\"password\":\"managed-secret\"}",
            transport.lastRequest?.body,
        )
    }

    @Test
    fun runtimeUsesTesterBridgeBeforeLocalSessionFallback() {
        val store = NativeSupabaseSessionStore(InMemoryNativeKeyValueStore())
        val transport = RecordingAuthTransport(
            NativeSupabaseAuthResponse(
                statusCode = 200,
                body = """
                    {
                      "access_token": "runtime-token",
                      "refresh_token": "refresh-token",
                      "expires_at": 2000,
                      "user": { "id": "user-1", "email": "pws_dev@test.pws" }
                    }
                """.trimIndent(),
            ),
        )
        val runtime = PwsNativeRuntime(
            supabaseSessionStore = store,
            testerAuthBridge = NativeTesterAuthBridge(
                authClient = NativeSupabaseAuthClient(
                    supabaseUrl = "https://project.supabase.co",
                    supabaseAnonKey = "anon-key",
                    transport = transport,
                    nowEpochSeconds = { 1_000L },
                ),
                sessionStore = store,
                testerPassword = "secret",
            ),
        )

        val snapshot = runtime.signInTesterWithRemoteSession("pws_dev")

        assertEquals("dev-pws_dev", snapshot.session.user?.id)
        assertEquals("runtime-token", runtime.currentSupabaseAccessToken(nowEpochSeconds = 1_100L))
        assertEquals("{\"email\":\"pws_dev@test.pws\",\"password\":\"secret\"}", transport.lastRequest?.body)
    }


    @Test
    fun runtimeFallsBackToLocalTesterSessionWhenRemoteTesterAuthFails() {
        val store = NativeSupabaseSessionStore(InMemoryNativeKeyValueStore())
        val transport = RecordingAuthTransport(
            NativeSupabaseAuthResponse(
                statusCode = 400,
                body = """{"error_code":"invalid_credentials","msg":"Invalid login credentials"}""",
            ),
        )
        val runtime = PwsNativeRuntime(
            supabaseSessionStore = store,
            testerAuthBridge = NativeTesterAuthBridge(
                authClient = NativeSupabaseAuthClient(
                    supabaseUrl = "https://project.supabase.co",
                    supabaseAnonKey = "anon-key",
                    transport = transport,
                ),
                sessionStore = store,
                testerPassword = "secret",
            ),
        )

        val snapshot = runtime.signInTesterWithRemoteSession("pws_dev")

        assertEquals("dev-pws_dev", snapshot.session.user?.id)
        assertEquals(null, runtime.currentSupabaseAccessToken(nowEpochSeconds = 1_100L))
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
