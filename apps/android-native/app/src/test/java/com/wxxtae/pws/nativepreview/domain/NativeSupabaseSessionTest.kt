package com.wxxtae.pws.nativepreview.domain

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class NativeSupabaseSessionTest {
    @Test
    fun storePersistsAndReturnsUnexpiredAccessToken() {
        val keyValueStore = InMemoryNativeKeyValueStore()
        val store = NativeSupabaseSessionStore(keyValueStore)

        store.save(
            NativeSupabaseSession(
                accessToken = " access-token ",
                refreshToken = " refresh-token ",
                expiresAtEpochSeconds = 2_000L,
                userId = "user-1",
                userEmail = " user-1@test.pws ",
            ),
        )

        val restored = store.load()
        assertEquals("access-token", restored?.accessToken)
        assertEquals("refresh-token", restored?.refreshToken)
        assertEquals(2_000L, restored?.expiresAtEpochSeconds)
        assertEquals("user-1", restored?.userId)
        assertEquals("user-1@test.pws", restored?.userEmail)
        assertEquals("access-token", store.getValidAccessToken(nowEpochSeconds = 1_900L))
    }

    @Test
    fun storeDoesNotReturnExpiredOrBlankSessions() {
        val store = NativeSupabaseSessionStore(InMemoryNativeKeyValueStore())

        store.save(NativeSupabaseSession(accessToken = "token", expiresAtEpochSeconds = 1_000L))

        assertNull(store.getValidAccessToken(nowEpochSeconds = 941L))
        store.clear()
        assertNull(store.load())
    }

    @Test
    fun runtimeClearsPersistedSupabaseSessionOnSignOut() {
        val store = NativeSupabaseSessionStore(InMemoryNativeKeyValueStore())
        store.save(NativeSupabaseSession(accessToken = "token", expiresAtEpochSeconds = 2_000L))
        val runtime = PwsNativeRuntime(supabaseSessionStore = store)

        assertEquals("token", runtime.currentSupabaseAccessToken(nowEpochSeconds = 1_000L))
        runtime.dispatchSession(NativeSessionAction.SignOut)

        assertNull(runtime.currentSupabaseAccessToken(nowEpochSeconds = 1_000L))
        assertTrue(runtime.snapshot.feedback.todayFeedback.isEmpty())
    }

    @Test
    fun storeRejectsPlaintextSessionPersistenceWhenDisabled() {
        val backingStore = InMemoryNativeKeyValueStore()
        val store = NativeSupabaseSessionStore(backingStore, allowPlaintextPersistence = false)

        val error = runCatching {
            store.save(NativeSupabaseSession(accessToken = "token", expiresAtEpochSeconds = 2_000L))
        }.exceptionOrNull()

        assertEquals(SecureSupabaseSessionStoreRequiredMessage, error?.message)
        assertNull(store.load())
        assertNull(store.getValidAccessToken(nowEpochSeconds = 1_000L))
    }

    @Test
    fun storeAllowsPersistentSessionsWhenBackingStoreIsSecure() {
        val backingStore = SecureInMemoryNativeKeyValueStore()
        val store = NativeSupabaseSessionStore(backingStore, allowPlaintextPersistence = false)

        store.save(
            NativeSupabaseSession(
                accessToken = "secure-token",
                refreshToken = "secure-refresh",
                expiresAtEpochSeconds = 2_000L,
                userId = "user-secure",
                userEmail = "secure@test.pws",
            ),
        )

        val restored = store.load()
        assertEquals("secure-token", restored?.accessToken)
        assertEquals("secure-refresh", restored?.refreshToken)
        assertEquals("user-secure", restored?.userId)
        assertEquals("secure@test.pws", restored?.userEmail)
        assertEquals("secure-token", store.getValidAccessToken(nowEpochSeconds = 1_000L))
    }
}

private class SecureInMemoryNativeKeyValueStore : NativeKeyValueStore {
    override val isSecureAtRest: Boolean = true
    private val values = mutableMapOf<String, String>()

    override fun getString(key: String): String? = values[key]

    override fun putString(key: String, value: String) {
        values[key] = value
    }

    override fun remove(key: String) {
        values.remove(key)
    }
}
