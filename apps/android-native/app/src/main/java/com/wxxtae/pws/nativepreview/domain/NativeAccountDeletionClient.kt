package com.wxxtae.pws.nativepreview.domain

import com.wxxtae.pws.nativepreview.BuildConfig

class NativeAccountDeletionClient(
    private val supabaseUrl: String,
    private val supabaseAnonKey: String,
    private val accessTokenProvider: () -> String?,
    private val transport: NativeSupabaseProfileTransport = HttpUrlConnectionNativeSupabaseProfileTransport(),
) {
    fun deleteOwnAccount() {
        val response = transport.send(
            NativeSupabaseProfileRequest(
                method = "POST",
                url = rpcUrl(),
                headers = NativeSupabaseProfileContract.headers(supabaseAnonKey, requireAccessToken()),
                body = "{}",
            ),
        )
        if (response.statusCode !in 200..299) {
            throw IllegalStateException(accountDeletionErrorMessage(response.statusCode, response.body))
        }
    }

    private fun requireAccessToken(): String = accessTokenProvider()?.trim()?.takeIf { it.isNotBlank() }
        ?: throw IllegalStateException("Supabase access token is required for account deletion")

    private fun rpcUrl(): String {
        val base = supabaseUrl.trim().trimEnd('/')
        require(base.isNotBlank()) { "Missing required Expo public env: EXPO_PUBLIC_SUPABASE_URL" }
        return "$base/rest/v1/rpc/delete_own_account"
    }

    companion object {
        fun fromBuildConfigOrNull(
            accessTokenProvider: () -> String?,
            transport: NativeSupabaseProfileTransport = HttpUrlConnectionNativeSupabaseProfileTransport(),
        ): NativeAccountDeletionClient? {
            val url = BuildConfig.EXPO_PUBLIC_SUPABASE_URL.trim()
            val anonKey = BuildConfig.EXPO_PUBLIC_SUPABASE_ANON_KEY.trim()
            if (url.isBlank() || anonKey.isBlank()) return null
            return NativeAccountDeletionClient(url, anonKey, accessTokenProvider, transport)
        }
    }
}

private fun accountDeletionErrorMessage(statusCode: Int, body: String): String {
    val lower = body.lowercase()
    return when {
        statusCode == 401 || statusCode == 403 -> "계정 삭제 인증이 필요합니다"
        lower.contains("not found") -> "삭제할 계정을 찾지 못했습니다"
        statusCode >= 500 -> "계정 삭제 서버 응답을 가져오지 못했습니다"
        else -> "계정 삭제가 완료되지 않았습니다 ($statusCode)"
    }
}
