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
            ),
        )

        val restored = store.load()
        assertEquals("access-token", restored?.accessToken)
        assertEquals("refresh-token", restored?.refreshToken)
        assertEquals(2_000L, restored?.expiresAtEpochSeconds)
        assertEquals("user-1", restored?.userId)
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
}
