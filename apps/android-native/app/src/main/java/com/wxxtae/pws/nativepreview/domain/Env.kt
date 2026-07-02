package com.wxxtae.pws.nativepreview.domain

const val PublicEnvErrorPrefix: String = "Missing required Expo public env"

object PwsEnv {
    fun resolveRequiredPublicEnv(env: Map<String, String?>, key: String): String {
        val value = env[key]?.trim().orEmpty()
        if (value.isBlank()) throw IllegalStateException("$PublicEnvErrorPrefix: $key")
        return value
    }
}
