package com.wxxtae.pws.nativepreview.domain

interface NativeKeyValueStore {
    fun getString(key: String): String?
    fun putString(key: String, value: String)
    fun remove(key: String)
}

class InMemoryNativeKeyValueStore(
    initialValues: Map<String, String> = emptyMap(),
) : NativeKeyValueStore {
    private val values = initialValues.toMutableMap()

    override fun getString(key: String): String? = values[key]

    override fun putString(key: String, value: String) {
        values[key] = value
    }

    override fun remove(key: String) {
        values.remove(key)
    }
}
