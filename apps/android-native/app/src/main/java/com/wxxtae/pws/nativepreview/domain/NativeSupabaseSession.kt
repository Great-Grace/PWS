package com.wxxtae.pws.nativepreview.domain

private const val SupabaseAccessTokenKey = "supabase.access_token"
private const val SupabaseRefreshTokenKey = "supabase.refresh_token"
private const val SupabaseExpiresAtKey = "supabase.expires_at_epoch_seconds"
private const val SupabaseUserIdKey = "supabase.user_id"

private const val TokenExpirySkewSeconds: Long = 60

data class NativeSupabaseSession(
    val accessToken: String,
    val refreshToken: String? = null,
    val expiresAtEpochSeconds: Long? = null,
    val userId: String? = null,
) {
    fun isUsable(nowEpochSeconds: Long): Boolean {
        if (accessToken.isBlank()) return false
        val expiresAt = expiresAtEpochSeconds ?: return true
        return expiresAt - TokenExpirySkewSeconds > nowEpochSeconds
    }
}

class NativeSupabaseSessionStore(
    private val keyValueStore: NativeKeyValueStore,
) {
    fun save(session: NativeSupabaseSession) {
        require(session.accessToken.isNotBlank()) { "Supabase access token must not be blank" }
        keyValueStore.putString(SupabaseAccessTokenKey, session.accessToken.trim())
        session.refreshToken?.trim()?.takeIf { it.isNotBlank() }?.let { token ->
            keyValueStore.putString(SupabaseRefreshTokenKey, token)
        } ?: keyValueStore.remove(SupabaseRefreshTokenKey)
        session.expiresAtEpochSeconds?.let { expiresAt ->
            keyValueStore.putString(SupabaseExpiresAtKey, expiresAt.toString())
        } ?: keyValueStore.remove(SupabaseExpiresAtKey)
        session.userId?.trim()?.takeIf { it.isNotBlank() }?.let { userId ->
            keyValueStore.putString(SupabaseUserIdKey, userId)
        } ?: keyValueStore.remove(SupabaseUserIdKey)
    }

    fun load(): NativeSupabaseSession? {
        val accessToken = keyValueStore.getString(SupabaseAccessTokenKey)?.trim().orEmpty()
        if (accessToken.isBlank()) return null
        return NativeSupabaseSession(
            accessToken = accessToken,
            refreshToken = keyValueStore.getString(SupabaseRefreshTokenKey)?.trim()?.takeIf { it.isNotBlank() },
            expiresAtEpochSeconds = keyValueStore.getString(SupabaseExpiresAtKey)?.trim()?.toLongOrNull(),
            userId = keyValueStore.getString(SupabaseUserIdKey)?.trim()?.takeIf { it.isNotBlank() },
        )
    }

    fun getValidAccessToken(nowEpochSeconds: Long = System.currentTimeMillis() / 1000): String? {
        val session = load() ?: return null
        return session.accessToken.takeIf { session.isUsable(nowEpochSeconds) }
    }

    fun clear() {
        keyValueStore.remove(SupabaseAccessTokenKey)
        keyValueStore.remove(SupabaseRefreshTokenKey)
        keyValueStore.remove(SupabaseExpiresAtKey)
        keyValueStore.remove(SupabaseUserIdKey)
    }
}
