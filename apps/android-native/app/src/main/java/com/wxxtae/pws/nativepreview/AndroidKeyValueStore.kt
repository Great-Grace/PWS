package com.wxxtae.pws.nativepreview

import android.content.Context
import com.wxxtae.pws.nativepreview.domain.NativeKeyValueStore

class AndroidSharedPreferencesKeyValueStore(
    context: Context,
    name: String = "pws-native-preview",
) : NativeKeyValueStore {
    private val preferences = context.applicationContext.getSharedPreferences(name, Context.MODE_PRIVATE)

    override fun getString(key: String): String? = preferences.getString(key, null)

    override fun putString(key: String, value: String) {
        preferences.edit().putString(key, value).apply()
    }

    override fun remove(key: String) {
        preferences.edit().remove(key).apply()
    }
}
