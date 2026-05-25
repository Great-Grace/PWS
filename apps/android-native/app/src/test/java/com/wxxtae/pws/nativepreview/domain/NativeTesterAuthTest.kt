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
    fun runtimeUsesRemoteSupabaseUserIdAfterTesterBridgeSignIn() {
        val store = NativeSupabaseSessionStore(InMemoryNativeKeyValueStore())
        val transport = RecordingAuthTransport(
            NativeSupabaseAuthResponse(
                statusCode = 200,
                body = """
                    {
                      "access_token": "runtime-token",
                      "refresh_token": "refresh-token",
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

        assertEquals("user-1", snapshot.session.user?.id)
        assertEquals("pws_dev", snapshot.session.user?.nickname)
        assertEquals("runtime-token", runtime.currentSupabaseAccessToken(nowEpochSeconds = 1_100L))
        assertEquals("{\"email\":\"pws_dev@test.pws\",\"password\":\"secret\"}", transport.lastRequest?.body)
    }

    @Test
    fun runtimeUsesRemoteProfileWhenTesterProfileExists() {
        val store = NativeSupabaseSessionStore(InMemoryNativeKeyValueStore())
        val authTransport = RecordingAuthTransport(
            NativeSupabaseAuthResponse(
                statusCode = 200,
                body = """
                    {
                      "access_token": "runtime-token",
                      "refresh_token": "refresh-token",
                      "user": { "id": "user-1", "email": "pws_dev@test.pws" }
                    }
                """.trimIndent(),
            ),
        )
        val profileTransport = RecordingProfileTransport(
            NativeSupabaseProfileResponse(
                statusCode = 200,
                body = """
                    [{
                      "id": "user-1",
                      "email": "pws_dev@test.pws",
                      "nickname": "원격테스터",
                      "climate_zone": "서울특별시 강남구",
                      "onboarding_done": true,
                      "birth_year": 1994,
                      "gender": "male"
                    }]
                """.trimIndent(),
            ),
        )
        val runtime = PwsNativeRuntime(
            supabaseSessionStore = store,
            testerAuthBridge = NativeTesterAuthBridge(
                authClient = NativeSupabaseAuthClient(
                    supabaseUrl = "https://project.supabase.co",
                    supabaseAnonKey = "anon-key",
                    transport = authTransport,
                    nowEpochSeconds = { 1_000L },
                ),
                sessionStore = store,
                testerPassword = "secret",
            ),
            profileClient = NativeSupabaseProfileClient(
                supabaseUrl = "https://project.supabase.co",
                supabaseAnonKey = "anon-key",
                accessTokenProvider = store::getValidAccessToken,
                transport = profileTransport,
            ),
        )

        val snapshot = runtime.signInTesterWithRemoteSession("pws_dev")

        assertEquals("user-1", snapshot.session.user?.id)
        assertEquals("원격테스터", snapshot.session.user?.nickname)
        assertEquals("서울특별시 강남구", snapshot.session.user?.regionLabel)
        assertEquals("Bearer runtime-token", profileTransport.lastRequest?.headers?.get("Authorization"))
    }

    @Test
    fun runtimeSupportsEmailPasswordSignInWithoutTesterPassword() {
        val store = NativeSupabaseSessionStore(InMemoryNativeKeyValueStore())
        val transport = RecordingAuthTransport(
            NativeSupabaseAuthResponse(
                statusCode = 200,
                body = """
                    {
                      "access_token": "runtime-token",
                      "refresh_token": "refresh-token",
                      "expires_at": 2000,
                      "user": { "id": "user-2", "email": "real@test.pws" }
                    }
                """.trimIndent(),
            ),
        )
        val runtime = PwsNativeRuntime(
            supabaseSessionStore = store,
            passwordAuthBridge = NativePasswordAuthBridge(
                authClient = NativeSupabaseAuthClient(
                    supabaseUrl = "https://project.supabase.co",
                    supabaseAnonKey = "anon-key",
                    transport = transport,
                    nowEpochSeconds = { 1_000L },
                ),
                sessionStore = store,
            ),
            allowLocalTesterFallback = false,
        )

        val snapshot = runtime.signInWithPasswordSession(" real@test.pws ", "secret")

        assertEquals("user-2", snapshot.session.user?.id)
        assertEquals("real", snapshot.session.user?.nickname)
        assertEquals("runtime-token", runtime.currentSupabaseAccessToken(nowEpochSeconds = 1_100L))
        assertEquals("{\"email\":\"real@test.pws\",\"password\":\"secret\"}", transport.lastRequest?.body)
    }

    @Test
    fun runtimeFallsBackToLocalTesterSessionWhenDebugRemoteTesterAuthFails() {
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

    @Test
    fun runtimeDoesNotOpenLocalSessionWhenReleaseRemoteTesterAuthFails() {
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
            allowLocalTesterFallback = false,
        )

        val snapshot = runtime.signInTesterWithRemoteSession("pws_dev")

        assertEquals(null, snapshot.session.user)
        assertEquals(null, runtime.currentSupabaseAccessToken(nowEpochSeconds = 1_100L))
    }

    @Test
    fun runtimeDoesNotOpenLocalSessionWhenReleaseTesterBridgeIsMissing() {
        val runtime = PwsNativeRuntime(allowLocalTesterFallback = false)

        val snapshot = runtime.signInTesterWithRemoteSession("pws_dev")

        assertEquals(null, snapshot.session.user)
    }

    @Test
    fun testerBridgeFactoryIsDebugOnlyWhenPasswordComesFromBuildConfig() {
        val store = NativeSupabaseSessionStore(InMemoryNativeKeyValueStore())
        val bridge = NativeTesterAuthBridge.fromEnvironmentOrNull(
            supabaseUrl = "https://project.supabase.co",
            supabaseAnonKey = "anon-key",
            testerPassword = "secret",
            isDebugBuild = false,
            sessionStore = store,
            transport = RecordingAuthTransport(NativeSupabaseAuthResponse(200, "{}")),
        )

        assertEquals(null, bridge)
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

    private class RecordingProfileTransport(
        private val response: NativeSupabaseProfileResponse,
    ) : NativeSupabaseProfileTransport {
        var lastRequest: NativeSupabaseProfileRequest? = null

        override fun send(request: NativeSupabaseProfileRequest): NativeSupabaseProfileResponse {
            lastRequest = request
            return response
        }
    }
}
