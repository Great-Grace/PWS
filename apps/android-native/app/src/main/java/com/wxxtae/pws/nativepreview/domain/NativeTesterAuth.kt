package com.wxxtae.pws.nativepreview.domain

import com.wxxtae.pws.nativepreview.BuildConfig

data class NativeTesterSignInResult(
    val session: NativeSupabaseSession,
    val userEmail: String,
    val testerId: String,
)

class NativeTesterAuthBridge(
    private val authClient: NativeSupabaseAuthClient,
    private val sessionStore: NativeSupabaseSessionStore,
    private val testerPassword: String,
) {
    fun signInTester(testerId: String): NativeTesterSignInResult {
        val normalizedTesterId = TesterAuth.normalizeTesterId(testerId)
        val config = TesterAuth.resolveTesterAuthConfig(testerPassword)
        val email = TesterAuth.testerEmail(normalizedTesterId)
        val result = authClient.signInWithPasswordResult(
            email = email,
            password = config.password,
        )
        sessionStore.save(result.session)
        return NativeTesterSignInResult(
            session = result.session,
            userEmail = result.userEmail ?: email,
            testerId = normalizedTesterId,
        )
    }

    companion object {
        fun fromBuildConfigOrNull(
            sessionStore: NativeSupabaseSessionStore,
            transport: NativeSupabaseAuthTransport = HttpUrlConnectionNativeSupabaseAuthTransport(),
        ): NativeTesterAuthBridge? {
            val url = BuildConfig.EXPO_PUBLIC_SUPABASE_URL.trim()
            val anonKey = BuildConfig.EXPO_PUBLIC_SUPABASE_ANON_KEY.trim()
            val password = BuildConfig.EXPO_PUBLIC_TEST_PASSWORD.trim()
            if (url.isBlank() || anonKey.isBlank() || password.isBlank()) return null
            return NativeTesterAuthBridge(
                authClient = NativeSupabaseAuthClient(
                    supabaseUrl = url,
                    supabaseAnonKey = anonKey,
                    transport = transport,
                ),
                sessionStore = sessionStore,
                testerPassword = password,
            )
        }
    }
}
