package com.wxxtae.pws.nativepreview.domain

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class EnvAndSecureStoreTest {
    @Test
    fun requiredPublicEnvTrimsAndThrowsWithReferencePrefix() {
        assertEquals("url", PwsEnv.resolveRequiredPublicEnv(mapOf("EXPO_PUBLIC_SUPABASE_URL" to " url "), "EXPO_PUBLIC_SUPABASE_URL"))
        try {
            PwsEnv.resolveRequiredPublicEnv(mapOf("EXPO_PUBLIC_SUPABASE_URL" to "  "), "EXPO_PUBLIC_SUPABASE_URL")
            throw AssertionError("blank env should throw")
        } catch (error: IllegalStateException) {
            assertEquals("$PublicEnvErrorPrefix: EXPO_PUBLIC_SUPABASE_URL", error.message)
        }
    }

    @Test
    fun chunkKeysAndMetadataMatchReferenceRules() {
        assertEquals("session.2", SecureStoreChunks.chunkKey("session", 2))
        assertEquals(ChunkMetadata(chunked = true, count = 3), SecureStoreChunks.parseChunkMetadata("{\"chunked\":true,\"count\":3}"))
        assertNull(SecureStoreChunks.parseChunkMetadata(null))
        assertNull(SecureStoreChunks.parseChunkMetadata("{}"))
        assertNull(SecureStoreChunks.parseChunkMetadata("{\"chunked\":true,\"count\":0}"))
        assertNull(SecureStoreChunks.parseChunkMetadata("{\"chunked\":true,\"count\":21}"))
    }

    @Test
    fun splitSecureStoreValueChunksAtReferenceSizeAndRejectsHugeValues() {
        val value = "a".repeat(SecureStoreChunkSize * 2 + 7)
        val chunks = SecureStoreChunks.splitSecureStoreValue(value)
        assertEquals(3, chunks.size)
        assertEquals(SecureStoreChunkSize, chunks[0].length)
        assertEquals(7, chunks[2].length)

        try {
            SecureStoreChunks.splitSecureStoreValue("x".repeat(SecureStoreChunkSize * SecureStoreMaxChunks + 1))
            throw AssertionError("oversized secure-store value should throw")
        } catch (error: IllegalStateException) {
            assertEquals(SecureStoreTooLargeError, error.message)
        }
        assertTrue(SecureStoreChunks.splitSecureStoreValue("").isEmpty())
    }
}
