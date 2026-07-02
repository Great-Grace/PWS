package com.wxxtae.pws.nativepreview.domain

const val SecureStoreChunkSize: Int = 1800
const val SecureStoreMaxChunks: Int = 20
const val SecureStoreTooLargeError: String = "Supabase auth session is too large for SecureStore"

data class ChunkMetadata(
    val chunked: Boolean,
    val count: Int,
)

object SecureStoreChunks {
    fun chunkKey(key: String, index: Int): String = "$key.$index"

    fun parseChunkMetadata(value: String?): ChunkMetadata? {
        if (value.isNullOrBlank()) return null
        val compact = value.replace(" ", "")
        if (!compact.contains("\"chunked\":true")) return null
        val countMatch = Regex("\"count\":(\\d+)").find(compact) ?: return null
        val count = countMatch.groupValues[1].toIntOrNull() ?: return null
        if (count <= 0 || count > SecureStoreMaxChunks) return null
        return ChunkMetadata(chunked = true, count = count)
    }

    fun splitSecureStoreValue(value: String): List<String> {
        if (value.isEmpty()) return emptyList()
        val chunks = value.chunked(SecureStoreChunkSize)
        if (chunks.size > SecureStoreMaxChunks) throw IllegalStateException(SecureStoreTooLargeError)
        return chunks
    }
}
