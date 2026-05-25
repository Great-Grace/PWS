package com.wxxtae.pws.nativepreview.domain

import com.wxxtae.pws.nativepreview.BuildConfig

data class NativeTesterSignInResult(
    val session: NativeSupabaseSession,
    val userEmail: String,
    val testerId: String,
)

data class NativePasswordSignInResult(
    val session: NativeSupabaseSession,
    val userEmail: String,
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
            return fromEnvironmentOrNull(
                supabaseUrl = BuildConfig.EXPO_PUBLIC_SUPABASE_URL,
                supabaseAnonKey = BuildConfig.EXPO_PUBLIC_SUPABASE_ANON_KEY,
                testerPassword = BuildConfig.EXPO_PUBLIC_TEST_PASSWORD,
                isDebugBuild = BuildConfig.DEBUG,
                sessionStore = sessionStore,
                transport = transport,
            )
        }

        fun fromEnvironmentOrNull(
            supabaseUrl: String,
            supabaseAnonKey: String,
            testerPassword: String,
            isDebugBuild: Boolean,
            sessionStore: NativeSupabaseSessionStore,
            transport: NativeSupabaseAuthTransport = HttpUrlConnectionNativeSupabaseAuthTransport(),
        ): NativeTesterAuthBridge? {
            if (!isDebugBuild) return null
            val url = supabaseUrl.trim()
            val anonKey = supabaseAnonKey.trim()
            val password = testerPassword.trim()
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

class NativePasswordAuthBridge(
    private val authClient: NativeSupabaseAuthClient,
    private val sessionStore: NativeSupabaseSessionStore,
) {
    fun signIn(email: String, password: String): NativePasswordSignInResult {
        val normalizedEmail = email.trim()
        val result = authClient.signInWithPasswordResult(
            email = normalizedEmail,
            password = password,
        )
        sessionStore.save(result.session)
        return NativePasswordSignInResult(
            session = result.session,
            userEmail = result.userEmail ?: normalizedEmail,
        )
    }

    companion object {
        fun fromBuildConfigOrNull(
            sessionStore: NativeSupabaseSessionStore,
            transport: NativeSupabaseAuthTransport = HttpUrlConnectionNativeSupabaseAuthTransport(),
        ): NativePasswordAuthBridge? {
            val url = BuildConfig.EXPO_PUBLIC_SUPABASE_URL.trim()
            val anonKey = BuildConfig.EXPO_PUBLIC_SUPABASE_ANON_KEY.trim()
            if (url.isBlank() || anonKey.isBlank()) return null
            return NativePasswordAuthBridge(
                authClient = NativeSupabaseAuthClient(
                    supabaseUrl = url,
                    supabaseAnonKey = anonKey,
                    transport = transport,
                ),
                sessionStore = sessionStore,
            )
        }
    }
}
